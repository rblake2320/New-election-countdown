BEGIN;
CREATE TABLE IF NOT EXISTS public.congress_official_import_runs (
  id uuid PRIMARY KEY,
  manifest_sha256 text NOT NULL CHECK(manifest_sha256 ~ '^[a-f0-9]{64}$'),
  preimage_sha256 text NOT NULL CHECK(preimage_sha256 ~ '^[a-f0-9]{64}$'),
  postimage_sha256 text NOT NULL CHECK(postimage_sha256 ~ '^[a-f0-9]{64}$'),
  removal_plan_sha256 text CHECK(removal_plan_sha256 IS NULL OR removal_plan_sha256 ~ '^[a-f0-9]{64}$'),
  receipt jsonb NOT NULL,
  preimage jsonb NOT NULL,
  postimage jsonb NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
COMMIT;
