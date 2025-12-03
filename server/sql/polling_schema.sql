CREATE TABLE IF NOT EXISTS polls (
  id BIGSERIAL PRIMARY KEY,
  election_id INT NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  pollster TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  sample_size INT,
  method TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poll_results (
  id BIGSERIAL PRIMARY KEY,
  poll_id BIGINT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  candidate_id INT REFERENCES candidates(id) ON DELETE SET NULL,
  option TEXT,
  pct NUMERIC(5,2) NOT NULL,
  UNIQUE (poll_id, candidate_id, option)
);

CREATE INDEX IF NOT EXISTS idx_polls_election_end
  ON polls(election_id, end_date DESC, id DESC);