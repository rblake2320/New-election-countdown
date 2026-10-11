-- 2026-10-11 ET-10: poll-hours provenance columns (additive, idempotent)
ALTER TABLE elections ADD COLUMN IF NOT EXISTS poll_close_kind text;
ALTER TABLE elections ADD COLUMN IF NOT EXISTS poll_hours_basis text;
ALTER TABLE elections ADD COLUMN IF NOT EXISTS poll_hours_source text;
