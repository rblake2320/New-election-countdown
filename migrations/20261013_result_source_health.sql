-- Explicit release operation only. No boot application or report/profile rewrites.
BEGIN;
SELECT pg_advisory_xact_lock(2026110307);
CREATE TABLE IF NOT EXISTS public.result_source_health (
 election_id integer NOT NULL REFERENCES public.elections(id),
 source_id text NOT NULL,
 context_state text NOT NULL,
 context_election_date date NOT NULL,
 context_type text NOT NULL,
 context_level text NOT NULL,
 context_office text NOT NULL,
 outcome text NOT NULL CHECK(outcome IN ('success','failed','not_published')),
 automatic boolean NOT NULL,
 ttl_seconds integer NOT NULL CHECK(ttl_seconds BETWEEN 1 AND 3600),
 last_attempt_at timestamptz NOT NULL,
 last_success_at timestamptz NULL,
 stale_since timestamptz NULL,
 health_version bigint NOT NULL DEFAULT 1 CHECK(health_version>0),
 PRIMARY KEY(election_id,source_id,context_state,context_election_date,context_type,context_level,context_office)
);
COMMIT;
