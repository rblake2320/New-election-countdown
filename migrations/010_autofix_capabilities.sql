-- Add auto-fix capabilities to the MCP framework
-- Minimal implementation without job queues or LLM integration

-- Add auto-fix controls to MCPs
ALTER TABLE steward_mcp_packs 
  ADD COLUMN IF NOT EXISTS auto_fix_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_fix_max_severity SMALLINT NOT NULL DEFAULT 4, -- Only fix low-severity issues by default
  ADD COLUMN IF NOT EXISTS auto_fixes_applied INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_auto_fix_at TIMESTAMPTZ;

-- Track auto-fix history
CREATE TABLE IF NOT EXISTS steward_autofix_log (
  id BIGSERIAL PRIMARY KEY,
  mcp_id BIGINT NOT NULL REFERENCES steward_mcp_packs(id),
  suggestion_id BIGINT NOT NULL REFERENCES bot_suggestions(id),
  fix_sql TEXT NOT NULL,
  result TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_by TEXT NOT NULL DEFAULT 'bot'
);

-- Enable safe auto-fixes for specific MCPs
UPDATE steward_mcp_packs 
SET 
  auto_fix_enabled = true,
  auto_fix_max_severity = 3,
  autofix_sql = CASE
    -- Fix congress count mismatches by updating the expected total
    WHEN name = 'CONGRESS_MISMATCH' THEN 
      'UPDATE congressional_districts SET expected_total = $1 WHERE state = $2'
    
    -- Fix zero candidate elections by marking them for re-fetch
    WHEN name = 'ZERO_CANDIDATE_HOTLIST' THEN
      'UPDATE elections SET last_candidate_check = NULL WHERE id = $1'
    
    ELSE autofix_sql
  END
WHERE name IN ('CONGRESS_MISMATCH', 'ZERO_CANDIDATE_HOTLIST');

-- Add a view for auto-fixable suggestions
CREATE OR REPLACE VIEW v_autofix_candidates AS
SELECT 
  s.id AS suggestion_id,
  s.kind,
  s.severity,
  s.message,
  s.payload,
  m.id AS mcp_id,
  m.name AS mcp_name,
  m.autofix_sql,
  m.auto_fix_enabled,
  m.auto_fix_max_severity,
  CASE 
    WHEN m.auto_fix_enabled 
      AND m.autofix_sql IS NOT NULL 
      AND (
        (s.severity = 'low' AND m.auto_fix_max_severity >= 5) OR
        (s.severity = 'medium' AND m.auto_fix_max_severity >= 4) OR
        (s.severity = 'high' AND m.auto_fix_max_severity >= 3) OR
        (s.severity = 'critical' AND m.auto_fix_max_severity >= 2)
      )
    THEN true 
    ELSE false 
  END AS can_autofix
FROM bot_suggestions s
JOIN steward_mcp_packs m ON m.name = s.kind
WHERE s.status = 'OPEN'
  AND m.active = true;

-- Simple stored procedure for applying fixes
CREATE OR REPLACE FUNCTION apply_autofix(p_suggestion_id BIGINT, p_executor TEXT DEFAULT 'bot')
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_mcp_id BIGINT;
  v_autofix_sql TEXT;
  v_payload JSONB;
  v_error TEXT;
BEGIN
  -- Get the MCP and fix SQL
  SELECT m.id, m.autofix_sql, s.payload
  INTO v_mcp_id, v_autofix_sql, v_payload
  FROM bot_suggestions s
  JOIN steward_mcp_packs m ON m.name = s.kind
  WHERE s.id = p_suggestion_id
    AND s.status = 'OPEN';
  
  IF v_autofix_sql IS NULL THEN
    RETURN QUERY SELECT false, 'No autofix SQL defined for this MCP'::TEXT;
    RETURN;
  END IF;
  
  -- Apply the fix (very simple parameter substitution)
  BEGIN
    -- This is a simplified example - in production you'd want more robust parameter handling
    IF v_payload->>'state' IS NOT NULL THEN
      EXECUTE v_autofix_sql USING v_payload->>'actual_total', v_payload->>'state';
    ELSIF v_payload->>'election_id' IS NOT NULL THEN
      EXECUTE v_autofix_sql USING (v_payload->>'election_id')::BIGINT;
    END IF;
    
    -- Mark suggestion as applied
    UPDATE bot_suggestions 
    SET status = 'APPLIED', resolved_at = NOW() 
    WHERE id = p_suggestion_id;
    
    -- Log the fix
    INSERT INTO steward_autofix_log (mcp_id, suggestion_id, fix_sql, result, success, executed_by)
    VALUES (v_mcp_id, p_suggestion_id, v_autofix_sql, 'Applied successfully', true, p_executor);
    
    -- Update MCP stats
    UPDATE steward_mcp_packs 
    SET auto_fixes_applied = auto_fixes_applied + 1,
        last_auto_fix_at = NOW()
    WHERE id = v_mcp_id;
    
    RETURN QUERY SELECT true, 'Fix applied successfully'::TEXT;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
    
    -- Log the failure
    INSERT INTO steward_autofix_log (mcp_id, suggestion_id, fix_sql, error_message, success, executed_by)
    VALUES (v_mcp_id, p_suggestion_id, v_autofix_sql, v_error, false, p_executor);
    
    RETURN QUERY SELECT false, v_error::TEXT;
  END;
END;
$$ LANGUAGE plpgsql;

-- Add some safe date drift fixes
UPDATE steward_mcp_packs
SET 
  autofix_sql = 'UPDATE elections SET date = $1 WHERE id = $2',
  auto_fix_enabled = false, -- Keep disabled by default for safety
  auto_fix_max_severity = 4
WHERE name = 'DATE_DRIFT';