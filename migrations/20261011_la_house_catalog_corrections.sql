-- Atomic receipts for explicitly reviewed catalog corrections; no automatic election mutation.
CREATE TABLE IF NOT EXISTS election_catalog_correction_runs (
  id serial PRIMARY KEY,
  plan_sha256 text NOT NULL,
  source_url text NOT NULL,
  source_file_sha256 text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  receipt jsonb NOT NULL
);
