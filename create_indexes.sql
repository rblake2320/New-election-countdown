-- Create indexes for fast candidate lookups and counts
CREATE INDEX IF NOT EXISTS idx_candidates_election_id
  ON candidates (election_id);

CREATE INDEX IF NOT EXISTS idx_candidates_ballot
  ON candidates (election_id, COALESCE(ballot_position, 9999), name);

CREATE INDEX IF NOT EXISTS idx_elections_date ON elections (date);
CREATE INDEX IF NOT EXISTS idx_elections_state ON elections (state);

-- Optional: materialized view for candidate counts (for huge datasets)
CREATE MATERIALIZED VIEW IF NOT EXISTS election_candidate_counts AS
SELECT election_id, COUNT(*)::int AS candidate_count
FROM candidates GROUP BY election_id;

CREATE UNIQUE INDEX IF NOT EXISTS mv_ecc_pk ON election_candidate_counts (election_id);
