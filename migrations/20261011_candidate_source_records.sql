-- Additive provenance and durable transactional ingestion receipts. No backfill or inferred certification.
BEGIN;
CREATE TABLE IF NOT EXISTS candidate_source_records (
  id serial PRIMARY KEY,
  candidate_id integer NOT NULL REFERENCES candidates(id),
  source_layer text NOT NULL,
  source_url text NOT NULL,
  source_file_sha256 text NOT NULL,
  source_synced_at timestamptz NOT NULL,
  first_observed_at timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL
);
ALTER TABLE candidate_source_records ADD COLUMN IF NOT EXISTS first_observed_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE candidate_source_records ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_source_version
  ON candidate_source_records(candidate_id,source_layer,source_url,source_file_sha256);
-- Upgrade an earlier draft safely: only its latest observation can be current.
WITH ranked AS (
  SELECT id,row_number() OVER(PARTITION BY candidate_id,source_layer,source_url ORDER BY source_synced_at DESC,id DESC) AS rank
  FROM candidate_source_records WHERE is_current=true
)
UPDATE candidate_source_records s SET is_current=false FROM ranked r WHERE s.id=r.id AND r.rank>1;
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_source_current
  ON candidate_source_records(candidate_id,source_layer,source_url) WHERE is_current=true;
CREATE TABLE IF NOT EXISTS candidate_ingest_runs (
  id serial PRIMARY KEY,
  source_layer text NOT NULL,
  source_url text NOT NULL,
  source_file_sha256 text NOT NULL,
  applied_at timestamptz NOT NULL,
  receipt jsonb NOT NULL
);
COMMIT;
