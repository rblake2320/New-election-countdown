-- Elections listing perf
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_elections_date_id
  ON elections (election_date DESC, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_elections_state_date
  ON elections (state, election_date DESC, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_elections_type_level_date
  ON elections (election_type, government_level, election_date DESC, id);

-- Candidate counts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candidates_election_id
  ON candidates (election_id);

ANALYZE elections;
ANALYZE candidates;