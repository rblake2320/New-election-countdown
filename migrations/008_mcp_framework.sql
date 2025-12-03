-- Minimal MCP framework (policies as data)
CREATE TABLE IF NOT EXISTS steward_mcp_packs (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL DEFAULT '1.0',
  active BOOLEAN NOT NULL DEFAULT true,
  severity SMALLINT NOT NULL DEFAULT 3, -- 1=critical..5=low
  detector_sql TEXT,                     -- returns rows to suggest on (read-only SELECT)
  detector_kind TEXT NOT NULL DEFAULT 'SQL',  -- 'SQL' | 'CODE'
  autofix_sql TEXT,                      -- parameterized UPDATE for safe fixes
  confidence_threshold NUMERIC(5,4) NOT NULL DEFAULT 0.7500,
  priority_threshold SMALLINT NOT NULL DEFAULT 3,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'steward'
);

-- Execution runs metrics
CREATE TABLE IF NOT EXISTS steward_runs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  inserted_suggestions INT NOT NULL DEFAULT 0,
  applied INT NOT NULL DEFAULT 0,
  failed INT NOT NULL DEFAULT 0,
  notes TEXT
);

-- Human feedback to learn over time
CREATE TABLE IF NOT EXISTS steward_labels (
  id BIGSERIAL PRIMARY KEY,
  suggestion_id BIGINT NOT NULL REFERENCES bot_suggestions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,              -- RIGHT|WRONG|SKIPPED|FIXED_EXTERNALLY
  labeler TEXT DEFAULT 'system',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lightweight Authority KB for canonical facts
CREATE TABLE IF NOT EXISTS authority_sources (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  priority SMALLINT NOT NULL DEFAULT 3,
  enabled BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS authority_facts (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,  -- 'ELECTION'|'PERSON'|'DISTRICT'|'OFFICE'
  entity_id BIGINT,
  fact_type TEXT NOT NULL,    -- 'ELECTION_DATE'|'CANDIDATE_LIST'|'BALLOT_STATUS'
  fact_value JSONB NOT NULL,
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0.9000,
  source_id BIGINT REFERENCES authority_sources(id) ON DELETE SET NULL,
  source_url TEXT,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  checksum TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_authority_facts_entity ON authority_facts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_authority_facts_fact ON authority_facts(fact_type);

-- Aggregated metrics view
CREATE OR REPLACE VIEW v_steward_mcp_metrics AS
SELECT
  s.kind,
  COUNT(*) FILTER (WHERE s.status='OPEN') AS open,
  COUNT(*) FILTER (WHERE s.status='APPLIED') AS applied,
  COUNT(*) FILTER (WHERE s.status='DISMISSED') AS dismissed,
  COUNT(*) FILTER (WHERE s.status='FAILED') AS failed,
  ROUND(AVG(s.confidence)::numeric,4) AS avg_confidence,
  COALESCE(SUM(CASE WHEN l.label='RIGHT' THEN 1 WHEN l.label='WRONG' THEN 0 END)::float
           / NULLIF(SUM(CASE WHEN l.label IN ('RIGHT','WRONG') THEN 1 END),0), 0.0) AS precision_estimate
FROM bot_suggestions s
LEFT JOIN steward_labels l ON l.suggestion_id = s.id
GROUP BY s.kind;

-- Map authority facts to elections
CREATE OR REPLACE VIEW v_authoritative_election_dates AS
SELECT
  f.entity_id AS election_id,
  (f.fact_value->>'date')::date AS authoritative_date,
  f.confidence,
  s.priority,
  f.source_id,
  f.source_url
FROM authority_facts f
JOIN authority_sources s ON s.id = f.source_id
WHERE f.entity_type='ELECTION' AND f.fact_type='ELECTION_DATE' AND s.enabled = true;