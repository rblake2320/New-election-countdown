-- Create candidate_biography table if it doesn't exist
CREATE TABLE IF NOT EXISTS candidate_biography (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT,
  current_position TEXT,
  district TEXT,
  party TEXT,
  image_url TEXT,
  sources JSONB DEFAULT '[]',
  last_updated TIMESTAMP DEFAULT NOW()
);
