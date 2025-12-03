-- Temporal Facts and Versioning System for Election Data
-- This ensures dates, jurisdictions, and other hard facts are append-only and versioned

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Source tracking for data provenance
CREATE TABLE IF NOT EXISTS sources(
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  url          TEXT,
  authority    TEXT,        -- "CA SOS", "Sonoma County ROV", "ProPublica", etc.
  reliability  INTEGER NOT NULL DEFAULT 80 CHECK (reliability BETWEEN 0 AND 100),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, url)
);

-- Insert common sources
INSERT INTO sources(name, url, authority, reliability) VALUES
  ('Sonoma County ROV', 'https://sonomacounty.gov/registrar-of-voters', 'Sonoma County ROV', 95),
  ('CA Secretary of State', 'https://sos.ca.gov', 'CA SOS', 95),
  ('Google Civic API', 'https://developers.google.com/civic-information', 'Google', 85),
  ('ProPublica Congress API', 'https://www.propublica.org/datastore/api/propublica-congress-api', 'ProPublica', 90)
ON CONFLICT (name, url) DO NOTHING;

-- Election Facts: Immutable records of what we observed
CREATE TABLE IF NOT EXISTS election_facts (
  fact_id        BIGSERIAL PRIMARY KEY,
  election_id    BIGINT REFERENCES elections(id),
  fact_type      TEXT NOT NULL,          -- 'date', 'jurisdiction', 'office', 'candidate_list'
  fact_value     JSONB NOT NULL,         -- The actual fact data
  source_id      UUID REFERENCES sources(id),
  source_url     TEXT,
  observed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at    TIMESTAMPTZ,
  verifier_name  TEXT,
  confidence     INTEGER NOT NULL DEFAULT 80 CHECK (confidence BETWEEN 0 AND 100),
  UNIQUE (election_id, fact_type, fact_value, source_id)
);

-- Election Truth: Current canonical values we enforce
CREATE TABLE IF NOT EXISTS election_truth (
  election_id    BIGINT PRIMARY KEY REFERENCES elections(id),
  date_utc       TIMESTAMPTZ NOT NULL,
  jurisdiction   TEXT NOT NULL,
  office         TEXT NOT NULL,
  district       TEXT,
  status         TEXT NOT NULL DEFAULT 'scheduled',
  confidence     INTEGER NOT NULL DEFAULT 80,
  lock_reason    TEXT,                   -- e.g., "County certified", "State UDEL rule"
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by     TEXT
);

-- Version tracking for election date changes
CREATE TABLE IF NOT EXISTS election_date_versions (
  version_id     BIGSERIAL PRIMARY KEY,
  election_id    BIGINT NOT NULL REFERENCES elections(id),
  date_from      TIMESTAMPTZ NOT NULL,   -- Previous date
  date_to        TIMESTAMPTZ NOT NULL,   -- New date
  change_reason  TEXT NOT NULL,
  source_id      UUID REFERENCES sources(id),
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by     TEXT
);

-- Staging table for municipal candidates
CREATE TABLE IF NOT EXISTS staging_candidates (
  id             BIGSERIAL PRIMARY KEY,
  city           TEXT NOT NULL,
  state          TEXT NOT NULL CHECK (char_length(state) = 2),
  election_date  DATE,
  office         TEXT,
  candidate_name TEXT NOT NULL,
  party          TEXT,
  incumbent      BOOLEAN DEFAULT FALSE,
  source_url     TEXT,
  processed      BOOLEAN DEFAULT FALSE,
  loaded_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_staging_candidates_location ON staging_candidates(lower(city), state);
CREATE INDEX idx_staging_candidates_unprocessed ON staging_candidates(processed) WHERE NOT processed;

-- Helper function to check if date is CA UDEL (first Tuesday after first Monday in November of odd years)
CREATE OR REPLACE FUNCTION is_ca_udel_date(p_date DATE)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT 
    EXTRACT(YEAR FROM p_date)::INT % 2 = 1  -- Odd year
    AND EXTRACT(MONTH FROM p_date) = 11     -- November
    AND EXTRACT(DOW FROM p_date) = 2        -- Tuesday
    AND EXTRACT(DAY FROM p_date) BETWEEN 2 AND 8  -- First full week
    AND EXTRACT(DOW FROM DATE_TRUNC('month', p_date) + INTERVAL '1 day') <= 1;  -- First Monday check
$$;

-- Function to reconcile election dates with truth table
CREATE OR REPLACE FUNCTION reconcile_election_dates()
RETURNS TABLE(election_id BIGINT, old_date TIMESTAMPTZ, new_date TIMESTAMPTZ, reason TEXT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH updates AS (
    UPDATE elections e
    SET date = t.date_utc
    FROM election_truth t
    WHERE e.id = t.election_id
      AND e.date IS DISTINCT FROM t.date_utc
    RETURNING e.id, e.date AS old_date, t.date_utc AS new_date, t.lock_reason
  )
  SELECT u.id, u.old_date, u.new_date, COALESCE(u.lock_reason, 'Truth table reconciliation') AS reason
  FROM updates u;
END;
$$;

-- Function to detect CA local elections not on UDEL dates
CREATE OR REPLACE FUNCTION find_ca_udel_mismatches()
RETURNS TABLE(election_id BIGINT, title TEXT, current_date DATE, expected_date DATE)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.date::DATE AS current_date,
    CASE 
      WHEN EXTRACT(YEAR FROM e.date) % 2 = 0 THEN
        -- Even year, suggest next odd year November
        make_date((EXTRACT(YEAR FROM e.date) + 1)::INT, 11, 
          (8 - EXTRACT(DOW FROM make_date((EXTRACT(YEAR FROM e.date) + 1)::INT, 11, 1))::INT) % 7 + 2)
      ELSE
        -- Odd year, find correct November UDEL date
        make_date(EXTRACT(YEAR FROM e.date)::INT, 11,
          (8 - EXTRACT(DOW FROM make_date(EXTRACT(YEAR FROM e.date)::INT, 11, 1))::INT) % 7 + 2)
    END AS expected_date
  FROM elections e
  WHERE e.state = 'CA'
    AND e.level = 'Local'
    AND e.title ILIKE '%uniform district%'
    AND NOT is_ca_udel_date(e.date::DATE);
END;
$$;

-- Function to record an election fact
CREATE OR REPLACE FUNCTION record_election_fact(
  p_election_id BIGINT,
  p_fact_type TEXT,
  p_fact_value JSONB,
  p_source_name TEXT,
  p_source_url TEXT DEFAULT NULL,
  p_confidence INTEGER DEFAULT 80
)
RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE
  v_source_id UUID;
  v_fact_id BIGINT;
BEGIN
  -- Get or create source
  SELECT id INTO v_source_id
  FROM sources
  WHERE name = p_source_name
  LIMIT 1;
  
  IF v_source_id IS NULL THEN
    INSERT INTO sources(name, url, authority, reliability)
    VALUES (p_source_name, p_source_url, p_source_name, p_confidence)
    RETURNING id INTO v_source_id;
  END IF;
  
  -- Insert fact
  INSERT INTO election_facts(election_id, fact_type, fact_value, source_id, source_url, confidence)
  VALUES (p_election_id, p_fact_type, p_fact_value, v_source_id, p_source_url, p_confidence)
  ON CONFLICT (election_id, fact_type, fact_value, source_id) DO UPDATE
    SET observed_at = now(),
        confidence = GREATEST(election_facts.confidence, EXCLUDED.confidence)
  RETURNING fact_id INTO v_fact_id;
  
  RETURN v_fact_id;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_election_facts_election ON election_facts(election_id);
CREATE INDEX idx_election_facts_type ON election_facts(fact_type);
CREATE INDEX idx_election_truth_date ON election_truth(date_utc);
CREATE INDEX idx_date_versions_election ON election_date_versions(election_id);