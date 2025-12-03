-- Truth tables and static authorities for data validation
-- House seats by state (2020 apportionment) for congress validation

-- House seats by state (2020 apportionment)
CREATE TABLE IF NOT EXISTS house_seats_2020 (
  state char(2) PRIMARY KEY,
  house_seats int NOT NULL CHECK (house_seats >= 1)
);

-- Idempotent seed with full slate
INSERT INTO house_seats_2020(state, house_seats) VALUES
('AL',7),('AK',1),('AZ',9),('AR',4),('CA',52),('CO',8),('CT',5),('DE',1),('FL',28),
('GA',14),('HI',2),('ID',2),('IL',17),('IN',9),('IA',4),('KS',4),('KY',6),('LA',6),
('ME',2),('MD',8),('MA',9),('MI',13),('MN',8),('MS',4),('MO',8),('MT',2),('NE',3),
('NV',4),('NH',2),('NJ',12),('NM',3),('NY',26),('NC',14),('ND',1),('OH',15),('OK',5),
('OR',6),('PA',17),('RI',2),('SC',7),('SD',1),('TN',9),('TX',38),('UT',4),('VT',1),
('VA',11),('WA',10),('WV',2),('WI',8),('WY',1)
ON CONFLICT (state) DO UPDATE SET house_seats = EXCLUDED.house_seats;

-- Expected total members per state = house + 2 senators
CREATE OR REPLACE VIEW v_expected_congress_totals AS
SELECT state, house_seats, (house_seats + 2) AS expected_total
FROM house_seats_2020;

-- Election date authorities (for ingesting from official sources)
CREATE TABLE IF NOT EXISTS election_date_authorities (
  id            BIGSERIAL PRIMARY KEY,
  election_id   BIGINT NOT NULL REFERENCES elections(id),
  authority     TEXT NOT NULL,          -- e.g., 'CA_SOS','Sonoma_County_ROV','Google_Civic'
  reported_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  reported_date TIMESTAMPTZ NOT NULL,   -- authoritative date/time (TZ-aware)
  confidence    INT NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  priority      INT NOT NULL DEFAULT 100, -- lower = stronger authority
  notes         TEXT
);

CREATE INDEX idx_edauth_election_prio ON election_date_authorities(election_id, priority);

-- Priority elections that must have candidates
CREATE TABLE IF NOT EXISTS priority_elections (
  election_id    BIGINT PRIMARY KEY REFERENCES elections(id),
  min_candidates INT NOT NULL DEFAULT 2,
  within_days    INT NOT NULL DEFAULT 150,
  note           TEXT
);

-- View for priority elections missing candidates
CREATE OR REPLACE VIEW v_priority_missing_candidates AS
SELECT 
  p.election_id, 
  p.min_candidates, 
  p.within_days,
  e.title, 
  e.state, 
  e.level, 
  e.date as election_date,
  COUNT(c.id) AS candidate_count
FROM priority_elections p
JOIN elections e ON e.id = p.election_id
LEFT JOIN candidates c ON c.election_id = e.id
WHERE e.date <= now() + (p.within_days || ' days')::interval
GROUP BY p.election_id, p.min_candidates, p.within_days, e.title, e.state, e.level, e.date
HAVING COUNT(c.id) < p.min_candidates;