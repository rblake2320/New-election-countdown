-- Sanity Check Framework for Election Data Integrity
-- Detects anomalies, date regressions, duplicates, and missing data

-- Configuration table for sanity check parameters
CREATE TABLE IF NOT EXISTS sanity_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default configuration
INSERT INTO sanity_config(key, value, description) VALUES
  ('upcoming_window_days', '120', 'Days ahead to check for upcoming elections'),
  ('min_candidates_required', '1', 'Minimum candidates expected for upcoming elections'),
  ('ca_udel_enforce', 'true', 'Enforce CA Uniform District Election date rules'),
  ('auto_fix_dates', 'false', 'Automatically fix detected date issues')
ON CONFLICT (key) DO NOTHING;

-- Sanity check run tracking
CREATE TABLE IF NOT EXISTS sanity_runs (
  run_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  total_checks INTEGER DEFAULT 0,
  passed      INTEGER DEFAULT 0,
  warnings    INTEGER DEFAULT 0,
  failures    INTEGER DEFAULT 0,
  critical    INTEGER DEFAULT 0
);

-- Sanity check findings
CREATE TYPE sanity_severity AS ENUM ('info', 'warning', 'error', 'critical');

CREATE TABLE IF NOT EXISTS sanity_findings (
  finding_id   BIGSERIAL PRIMARY KEY,
  run_id       UUID NOT NULL REFERENCES sanity_runs(run_id),
  check_name   TEXT NOT NULL,
  severity     sanity_severity NOT NULL,
  entity_type  TEXT NOT NULL,  -- 'election', 'candidate', 'member'
  entity_id    BIGINT,
  message      TEXT NOT NULL,
  details      JSONB,
  auto_fixed   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sanity_findings_run ON sanity_findings(run_id);
CREATE INDEX idx_sanity_findings_severity ON sanity_findings(severity);
CREATE INDEX idx_sanity_findings_unfixed ON sanity_findings(auto_fixed) WHERE NOT auto_fixed;

-- Whitelist for known exceptions
CREATE TABLE IF NOT EXISTS sanity_whitelist (
  whitelist_id BIGSERIAL PRIMARY KEY,
  check_name   TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    BIGINT,
  reason       TEXT NOT NULL,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   TEXT,
  UNIQUE(check_name, entity_type, entity_id)
);

-- Main sanity check function
CREATE OR REPLACE FUNCTION run_sanity_checks()
RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
  v_run_id UUID;
  v_total INTEGER := 0;
  v_passed INTEGER := 0;
  v_warnings INTEGER := 0;
  v_failures INTEGER := 0;
  v_critical INTEGER := 0;
  v_record RECORD;
  v_check_count INTEGER;
BEGIN
  -- Create new run
  INSERT INTO sanity_runs(started_at) 
  VALUES (now()) 
  RETURNING run_id INTO v_run_id;
  
  -- Check 1: Duplicate elections (same state, date, office, district)
  v_total := v_total + 1;
  WITH duplicates AS (
    SELECT state, date, title, office, district, COUNT(*) as cnt,
           array_agg(id ORDER BY id) as election_ids
    FROM elections
    WHERE date >= CURRENT_DATE
    GROUP BY state, date, title, office, district
    HAVING COUNT(*) > 1
  )
  SELECT COUNT(*) INTO v_check_count FROM duplicates;
  
  IF v_check_count = 0 THEN
    v_passed := v_passed + 1;
  ELSE
    FOR v_record IN SELECT * FROM duplicates LOOP
      INSERT INTO sanity_findings(run_id, check_name, severity, entity_type, entity_id, message, details)
      SELECT v_run_id, 'duplicate_elections', 'error', 'election', unnest(v_record.election_ids),
             format('Duplicate election: %s %s on %s', v_record.state, v_record.title, v_record.date),
             jsonb_build_object('all_ids', v_record.election_ids, 'count', v_record.cnt);
      v_failures := v_failures + 1;
    END LOOP;
  END IF;
  
  -- Check 2: CA UDEL date compliance
  v_total := v_total + 1;
  IF (SELECT value FROM sanity_config WHERE key = 'ca_udel_enforce') = 'true' THEN
    WITH ca_udel_issues AS (
      SELECT * FROM find_ca_udel_mismatches()
    )
    SELECT COUNT(*) INTO v_check_count FROM ca_udel_issues;
    
    IF v_check_count = 0 THEN
      v_passed := v_passed + 1;
    ELSE
      FOR v_record IN SELECT * FROM ca_udel_issues LOOP
        -- Check if whitelisted
        IF NOT EXISTS (
          SELECT 1 FROM sanity_whitelist 
          WHERE check_name = 'ca_udel_date' 
            AND entity_type = 'election' 
            AND entity_id = v_record.election_id
            AND (expires_at IS NULL OR expires_at > now())
        ) THEN
          INSERT INTO sanity_findings(run_id, check_name, severity, entity_type, entity_id, message, details)
          VALUES (v_run_id, 'ca_udel_date', 'warning', 'election', v_record.election_id,
                  format('CA Uniform District Election on wrong date: %s (should be %s)', 
                         v_record.current_date, v_record.expected_date),
                  jsonb_build_object('title', v_record.title, 
                                     'current_date', v_record.current_date,
                                     'expected_date', v_record.expected_date));
          v_warnings := v_warnings + 1;
        END IF;
      END LOOP;
    END IF;
  ELSE
    v_passed := v_passed + 1;
  END IF;
  
  -- Check 3: Upcoming elections without candidates
  v_total := v_total + 1;
  WITH upcoming_no_candidates AS (
    SELECT e.id, e.title, e.date, e.state,
           COUNT(ec.candidate_id) as candidate_count
    FROM elections e
    LEFT JOIN election_candidates ec ON ec.election_id = e.id
    WHERE e.date BETWEEN CURRENT_DATE 
      AND CURRENT_DATE + ((SELECT value FROM sanity_config WHERE key = 'upcoming_window_days') || ' days')::INTERVAL
    GROUP BY e.id, e.title, e.date, e.state
    HAVING COUNT(ec.candidate_id) < (SELECT value::INTEGER FROM sanity_config WHERE key = 'min_candidates_required')
  )
  SELECT COUNT(*) INTO v_check_count FROM upcoming_no_candidates;
  
  IF v_check_count = 0 THEN
    v_passed := v_passed + 1;
  ELSE
    FOR v_record IN SELECT * FROM upcoming_no_candidates LOOP
      INSERT INTO sanity_findings(run_id, check_name, severity, entity_type, entity_id, message, details)
      VALUES (v_run_id, 'missing_candidates', 'warning', 'election', v_record.id,
              format('Election "%s" on %s has %s candidates', 
                     v_record.title, v_record.date, v_record.candidate_count),
              jsonb_build_object('title', v_record.title, 
                                 'date', v_record.date,
                                 'state', v_record.state,
                                 'candidate_count', v_record.candidate_count));
      v_warnings := v_warnings + 1;
    END LOOP;
  END IF;
  
  -- Check 4: Elections with inconsistent dates vs truth table
  v_total := v_total + 1;
  WITH date_mismatches AS (
    SELECT e.id, e.title, e.date as current_date, t.date_utc as truth_date
    FROM elections e
    INNER JOIN election_truth t ON t.election_id = e.id
    WHERE e.date IS DISTINCT FROM t.date_utc
  )
  SELECT COUNT(*) INTO v_check_count FROM date_mismatches;
  
  IF v_check_count = 0 THEN
    v_passed := v_passed + 1;
  ELSE
    FOR v_record IN SELECT * FROM date_mismatches LOOP
      INSERT INTO sanity_findings(run_id, check_name, severity, entity_type, entity_id, message, details)
      VALUES (v_run_id, 'date_mismatch', 'critical', 'election', v_record.id,
              format('Election date mismatch: DB has %s but truth table has %s', 
                     v_record.current_date, v_record.truth_date),
              jsonb_build_object('title', v_record.title,
                                 'current_date', v_record.current_date,
                                 'truth_date', v_record.truth_date));
      v_critical := v_critical + 1;
      
      -- Auto-fix if enabled
      IF (SELECT value FROM sanity_config WHERE key = 'auto_fix_dates') = 'true' THEN
        UPDATE elections 
        SET date = v_record.truth_date 
        WHERE id = v_record.id;
        
        UPDATE sanity_findings 
        SET auto_fixed = true 
        WHERE run_id = v_run_id 
          AND check_name = 'date_mismatch' 
          AND entity_id = v_record.id;
      END IF;
    END LOOP;
  END IF;
  
  -- Check 5: Congress member counts by state
  v_total := v_total + 1;
  WITH state_counts AS (
    SELECT state, COUNT(*) as actual_count,
           CASE state
             WHEN 'CA' THEN 54  -- 52 House + 2 Senate
             WHEN 'TX' THEN 40  -- 38 House + 2 Senate  
             WHEN 'FL' THEN 29  -- 27 House + 2 Senate
             WHEN 'NY' THEN 28  -- 26 House + 2 Senate
             ELSE NULL
           END as expected_count
    FROM congress_members
    WHERE is_voting_member = true
    GROUP BY state
  )
  SELECT COUNT(*) INTO v_check_count 
  FROM state_counts 
  WHERE expected_count IS NOT NULL 
    AND actual_count != expected_count;
  
  IF v_check_count = 0 THEN
    v_passed := v_passed + 1;
  ELSE
    FOR v_record IN 
      SELECT * FROM state_counts 
      WHERE expected_count IS NOT NULL 
        AND actual_count != expected_count 
    LOOP
      INSERT INTO sanity_findings(run_id, check_name, severity, entity_type, entity_id, message, details)
      VALUES (v_run_id, 'congress_count_mismatch', 'error', 'member', NULL,
              format('Congress member count for %s: expected %s, got %s', 
                     v_record.state, v_record.expected_count, v_record.actual_count),
              jsonb_build_object('state', v_record.state,
                                 'expected', v_record.expected_count,
                                 'actual', v_record.actual_count));
      v_failures := v_failures + 1;
    END LOOP;
  END IF;
  
  -- Update run summary
  UPDATE sanity_runs 
  SET finished_at = now(),
      total_checks = v_total,
      passed = v_passed,
      warnings = v_warnings,
      failures = v_failures,
      critical = v_critical
  WHERE run_id = v_run_id;
  
  RETURN v_run_id;
END;
$$;

-- Helper function to get latest sanity check summary
CREATE OR REPLACE FUNCTION get_sanity_summary()
RETURNS TABLE(
  run_id UUID,
  run_date TIMESTAMPTZ,
  total_checks INTEGER,
  passed INTEGER,
  warnings INTEGER,
  failures INTEGER,
  critical INTEGER,
  status TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.run_id,
    sr.started_at as run_date,
    sr.total_checks,
    sr.passed,
    sr.warnings,
    sr.failures,
    sr.critical,
    CASE 
      WHEN sr.critical > 0 THEN 'CRITICAL'
      WHEN sr.failures > 0 THEN 'FAILED'
      WHEN sr.warnings > 0 THEN 'WARNING'
      WHEN sr.passed = sr.total_checks THEN 'PASSED'
      ELSE 'UNKNOWN'
    END as status
  FROM sanity_runs sr
  ORDER BY sr.started_at DESC
  LIMIT 10;
END;
$$;

-- View for current open issues
CREATE OR REPLACE VIEW sanity_open_issues AS
SELECT 
  sf.finding_id,
  sf.check_name,
  sf.severity,
  sf.entity_type,
  sf.entity_id,
  sf.message,
  sf.details,
  sf.created_at,
  sr.started_at as run_date
FROM sanity_findings sf
JOIN sanity_runs sr ON sr.run_id = sf.run_id
WHERE NOT sf.auto_fixed
  AND NOT EXISTS (
    SELECT 1 FROM sanity_whitelist sw
    WHERE sw.check_name = sf.check_name
      AND sw.entity_type = sf.entity_type
      AND (sw.entity_id = sf.entity_id OR (sw.entity_id IS NULL AND sf.entity_id IS NULL))
      AND (sw.expires_at IS NULL OR sw.expires_at > now())
  )
ORDER BY 
  CASE sf.severity 
    WHEN 'critical' THEN 1
    WHEN 'error' THEN 2
    WHEN 'warning' THEN 3
    ELSE 4
  END,
  sf.created_at DESC;