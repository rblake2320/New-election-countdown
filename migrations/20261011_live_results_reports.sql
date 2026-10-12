-- ET-6 (owner decision 2026-10-11): live official results as append-only snapshots.
-- Run as a release operation before deploying the results writer. Additive only; safe to re-run.
-- No election data changes. Do not run at application boot.
BEGIN;
SELECT pg_advisory_xact_lock(2026110306);

CREATE TABLE IF NOT EXISTS public.election_result_reports (
  id                     serial PRIMARY KEY,
  election_id            integer NOT NULL REFERENCES public.elections(id),
  revision               text NOT NULL UNIQUE,
  status                 text NOT NULL CHECK (status IN ('unofficial', 'certified')),
  source_id              text NOT NULL,
  source_kind            text NOT NULL CHECK (source_kind IN ('official_state_enr', 'official_state_page', 'official_county', 'ap', 'admin_manual')),
  source_name            text NOT NULL,
  source_url             text NOT NULL CHECK (source_url ~ '^https://'),
  source_contest_id      text NOT NULL,
  source_payload_sha256  text NOT NULL CHECK (source_payload_sha256 ~ '^[a-f0-9]{64}$'),
  input_sha256           text NOT NULL CHECK (input_sha256 ~ '^[a-f0-9]{64}$'),
  as_of                  timestamptz NULL,
  as_of_basis            text NOT NULL CHECK (as_of_basis IN ('source_timestamp', 'source_publication_time', 'not_provided')),
  retrieved_at           timestamptz NOT NULL,
  reporting_percent      numeric(5,2) NULL CHECK (reporting_percent IS NULL OR (reporting_percent >= 0 AND reporting_percent <= 100)),
  reporting_basis        text NULL CHECK (reporting_basis IS NULL OR reporting_basis IN ('precincts', 'ballots', 'votes', 'source_unspecified')),
  precincts_reporting    integer NULL CHECK (precincts_reporting IS NULL OR precincts_reporting >= 0),
  precincts_total        integer NULL CHECK (precincts_total IS NULL OR precincts_total >= 0),
  total_votes            bigint NULL CHECK (total_votes IS NULL OR total_votes >= 0),
  winner_called_source   text NULL,
  winner_called_url      text NULL CHECK (winner_called_url IS NULL OR winner_called_url ~ '^https://'),
  winner_called_at       timestamptz NULL,
  certification_url      text NULL CHECK (certification_url IS NULL OR certification_url ~ '^https://'),
  certified_at           timestamptz NULL,
  -- Race context the snapshot was recorded under (copied from the election row, immutable).
  -- Reads only treat a report as current while this still equals the live election row.
  context_state          text NOT NULL,
  context_election_date  date NOT NULL,
  context_type           text NOT NULL,
  context_level          text NOT NULL,
  context_office         text NOT NULL,
  posted_by              text NOT NULL,
  idempotency_key        text NULL UNIQUE,
  note                   text NULL,
  supersedes_report_id   integer NULL REFERENCES public.election_result_reports(id),
  created_at             timestamptz NOT NULL DEFAULT now(),
  -- certified requires retained certification evidence; a declared winner requires its declaration
  CONSTRAINT election_result_reports_certified_evidence
    CHECK (status <> 'certified' OR certification_url IS NOT NULL),
  CONSTRAINT election_result_reports_winner_evidence
    CHECK ((winner_called_source IS NULL AND winner_called_url IS NULL AND winner_called_at IS NULL)
        OR (winner_called_source IS NOT NULL AND winner_called_url IS NOT NULL)),
  CONSTRAINT election_result_reports_as_of_basis
    CHECK ((as_of IS NULL) = (as_of_basis = 'not_provided')),
  CONSTRAINT election_result_reports_as_of_order
    CHECK (as_of IS NULL OR as_of <= retrieved_at)
);
-- Dedup is on the canonical INPUT (what was recorded), not the raw payload: one raw file can carry
-- two real revisions (WA recount workbook with before+after), and those must both be kept.
DROP INDEX IF EXISTS public.election_result_reports_snapshot_key;
CREATE UNIQUE INDEX IF NOT EXISTS election_result_reports_input_key
  ON public.election_result_reports (source_id, source_contest_id, input_sha256);
-- A qualified source contest key binds to exactly one election (NC shares one raw gid across the
-- DEM and REP Senate primaries; C qualifies the key, the DB refuses a second election for it).
CREATE INDEX IF NOT EXISTS election_result_reports_contest_key
  ON public.election_result_reports (source_id, source_contest_id, election_id);
CREATE INDEX IF NOT EXISTS election_result_reports_election_latest
  ON public.election_result_reports (election_id, id DESC);
CREATE INDEX IF NOT EXISTS election_result_reports_context_date
  ON public.election_result_reports (context_election_date, election_id);

CREATE TABLE IF NOT EXISTS public.candidate_result_lines (
  id                   serial PRIMARY KEY,
  report_id            integer NOT NULL REFERENCES public.election_result_reports(id) ON DELETE CASCADE,
  candidate_id         integer NULL REFERENCES public.candidates(id),
  source_candidate_id  text NOT NULL,
  name                 text NOT NULL,
  party                text NULL,
  votes                bigint NOT NULL CHECK (votes >= 0),
  percent              numeric(5,2) NULL CHECK (percent IS NULL OR (percent >= 0 AND percent <= 100)),
  is_winner_declared   boolean NOT NULL DEFAULT false,
  UNIQUE (report_id, source_candidate_id)
);
CREATE INDEX IF NOT EXISTS candidate_result_lines_report ON public.candidate_result_lines (report_id);

-- Retained source evidence (fetched payloads, admin-attached official pages). Reports reference it
-- by sha256; the server stores and re-hashes the bytes itself.
CREATE TABLE IF NOT EXISTS public.result_evidence_blobs (
  sha256        text PRIMARY KEY CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  content_type  text NOT NULL,
  filename      text NULL,
  size_bytes    integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  bytes         bytea NOT NULL,
  uploaded_by   text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- The legacy per-election projection row is upserted by election_id; it had no uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS election_results_election_id_key ON public.election_results (election_id);

COMMIT;
