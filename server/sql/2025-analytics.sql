-- analytics foundation (Neon Postgres)
CREATE SCHEMA IF NOT EXISTS analytics;

-- Sessions (no PII; coarse fields allowed)
CREATE TABLE IF NOT EXISTS analytics.sessions (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  anon_id         UUID        NOT NULL,
  user_id         INTEGER     NULL,
  ua              TEXT        NULL,
  referrer        TEXT        NULL,
  utm_source      TEXT        NULL,
  utm_medium      TEXT        NULL,
  utm_campaign    TEXT        NULL,
  utm_term        TEXT        NULL,
  utm_content     TEXT        NULL,
  ip_trunc        INET        NULL,
  country         TEXT        NULL,
  region          TEXT        NULL
);
CREATE INDEX IF NOT EXISTS idx_an_sessions_created_at ON analytics.sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_an_sessions_user ON analytics.sessions (user_id);

-- Events (monthly partitions)
CREATE TABLE IF NOT EXISTS analytics.events (
  id             BIGSERIAL NOT NULL,
  ts             TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id     BIGINT NOT NULL REFERENCES analytics.sessions(id) ON DELETE CASCADE,
  name           TEXT   NOT NULL,
  page           TEXT   NULL,
  election_id    INTEGER NULL,
  candidate_id   INTEGER NULL,
  value_num      NUMERIC NULL,
  payload        JSONB  NULL,
  PRIMARY KEY (id, ts)
) PARTITION BY RANGE (ts);

DO $$
DECLARE
  start_month DATE := date_trunc('month', now())::date;
  next_month  DATE := (date_trunc('month', now()) + interval '1 month')::date;
BEGIN
  EXECUTE format('CREATE TABLE IF NOT EXISTS analytics.events_%s PARTITION OF analytics.events FOR VALUES FROM (%L) TO (%L);',
    to_char(start_month, 'YYYYMM'), start_month, next_month);
  EXECUTE format('CREATE TABLE IF NOT EXISTS analytics.events_%s PARTITION OF analytics.events FOR VALUES FROM (%L) TO (%L);',
    to_char(next_month, 'YYYYMM'), next_month, (next_month + interval '1 month')::date);
END$$;

-- Aggregates
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_event_daily AS
SELECT date_trunc('day', ts) AS day, name, count(*)::int AS events
FROM analytics.events
GROUP BY 1,2;

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.mv_compare_daily AS
SELECT date_trunc('day', ts) AS day, election_id, count(*)::int AS compares
FROM analytics.events
WHERE name = 'compare_launched'
GROUP BY 1,2;

-- Helpful runtime indexes pattern (add on new partitions as needed)
-- Example: CREATE INDEX IF NOT EXISTS idx_events_YYYYMM_name_ts ON analytics.events_YYYYMM (name, ts DESC);