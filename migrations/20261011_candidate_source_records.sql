-- Additive provenance and durable transactional ingestion receipts. No backfill or inferred certification.
BEGIN;
CREATE TABLE IF NOT EXISTS candidate_source_records (
  id serial PRIMARY KEY,
  candidate_id integer NOT NULL REFERENCES candidates(id),
  source_layer text NOT NULL,
  source_url text NOT NULL,
  source_file_sha256 text NOT NULL,
  source_synced_at timestamptz NOT NULL,
  metadata jsonb NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_source_version
  ON candidate_source_records(candidate_id,source_layer,source_url,source_file_sha256);
CREATE TABLE IF NOT EXISTS candidate_ingest_runs (
  id serial PRIMARY KEY,
  source_layer text NOT NULL,
  source_url text NOT NULL,
  source_file_sha256 text NOT NULL,
  applied_at timestamptz NOT NULL,
  receipt jsonb NOT NULL
);
COMMIT;
