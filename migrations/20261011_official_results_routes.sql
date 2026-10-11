-- ET-11 C6: run as a release operation before deploying the new projection.
-- No election data changes; safe to run again. Do not run at application boot.
BEGIN;
SELECT pg_advisory_xact_lock(2026110301);
ALTER TABLE public.elections ADD COLUMN IF NOT EXISTS official_results_url text;
ALTER TABLE public.elections ADD COLUMN IF NOT EXISTS official_results_source jsonb;
CREATE TABLE IF NOT EXISTS public.official_results_sync_runs (
  id text PRIMARY KEY,
  operation text NOT NULL CHECK (operation IN ('apply', 'rollback')),
  manifest_sha256 text NOT NULL CHECK (manifest_sha256 ~ '^[a-f0-9]{64}$'),
  preimage_sha256 text NOT NULL CHECK (preimage_sha256 ~ '^[a-f0-9]{64}$'),
  postimage_sha256 text NOT NULL CHECK (postimage_sha256 ~ '^[a-f0-9]{64}$'),
  target_count integer NOT NULL CHECK (target_count > 0),
  changed_count integer NOT NULL CHECK (changed_count >= 0),
  changes jsonb NOT NULL CHECK (jsonb_typeof(changes) = 'array'),
  rollback_of text REFERENCES public.official_results_sync_runs(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS official_results_one_rollback
  ON public.official_results_sync_runs(rollback_of) WHERE rollback_of IS NOT NULL;
COMMIT;
