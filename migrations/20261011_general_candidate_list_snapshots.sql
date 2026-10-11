-- Complete receiving scopes retain provenance even when an official list is empty.
BEGIN;
CREATE TABLE IF NOT EXISTS general_candidate_list_snapshots (
  id serial PRIMARY KEY,
  election_id integer NOT NULL REFERENCES elections(id),
  scope_key text NOT NULL,
  source_url text NOT NULL,
  source_file_sha256 text NOT NULL,
  source_synced_at timestamptz NOT NULL,
  first_observed_at timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_general_list_snapshot_version
  ON general_candidate_list_snapshots(election_id,scope_key,source_url,source_file_sha256);
CREATE UNIQUE INDEX IF NOT EXISTS idx_general_list_snapshot_current
  ON general_candidate_list_snapshots(election_id,scope_key) WHERE is_current=true;
COMMIT;
