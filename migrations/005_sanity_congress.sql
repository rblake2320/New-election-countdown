-- Congress count validation and date reconciliation functions

-- Actual counts by state from congress_members table
CREATE OR REPLACE VIEW v_congress_counts_by_state AS
SELECT state, COUNT(*) AS actual_total
FROM congress_members
WHERE is_voting_member = true
  AND in_office = true
GROUP BY state;

-- Mismatches vs. expected totals (house + 2 senators)
CREATE OR REPLACE VIEW v_congress_mismatch AS
SELECT 
  e.state, 
  e.expected_total, 
  COALESCE(a.actual_total, 0) as actual_total,
  COALESCE(a.actual_total, 0) - e.expected_total AS delta
FROM v_expected_congress_totals e
LEFT JOIN v_congress_counts_by_state a ON a.state = e.state
WHERE COALESCE(a.actual_total, 0) != e.expected_total;

-- Ledger for election date changes
CREATE TABLE IF NOT EXISTS election_date_changes (
  change_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id  BIGINT NOT NULL REFERENCES elections(id),
  old_date     TIMESTAMPTZ,
  new_date     TIMESTAMPTZ NOT NULL,
  authority    TEXT NOT NULL,
  priority     INT NOT NULL,
  confidence   INT NOT NULL,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe reconcile function for election dates
CREATE OR REPLACE FUNCTION reconcile_election_dates_from_authorities(p_limit INT DEFAULT 500)
RETURNS INT 
LANGUAGE plpgsql AS $$
DECLARE 
  r RECORD; 
  changed INT := 0;
BEGIN
  FOR r IN
    SELECT 
      eda.election_id, 
      eda.reported_date, 
      eda.authority, 
      eda.priority, 
      eda.confidence,
      e.date AS current_date
    FROM election_date_authorities eda
    JOIN elections e ON e.id = eda.election_id
    WHERE eda.priority = (
      SELECT MIN(priority) 
      FROM election_date_authorities x 
      WHERE x.election_id = eda.election_id
    )
    ORDER BY eda.priority ASC, eda.reported_at DESC
    LIMIT p_limit
  LOOP
    IF r.current_date IS DISTINCT FROM r.reported_date THEN
      -- Update election date
      UPDATE elections
      SET date = r.reported_date
      WHERE id = r.election_id;

      -- Record the change
      INSERT INTO election_date_changes(
        election_id, old_date, new_date, authority, priority, confidence
      )
      VALUES (
        r.election_id, r.current_date, r.reported_date, 
        r.authority, r.priority, r.confidence
      );

      -- Update truth table if exists
      UPDATE election_truth
      SET date_utc = r.reported_date,
          updated_at = now(),
          updated_by = 'Authority: ' || r.authority
      WHERE election_id = r.election_id;

      changed := changed + 1;
    END IF;
  END LOOP;

  RETURN changed;
END;
$$;

-- Enhanced sanity check for congress counts
CREATE OR REPLACE FUNCTION sanity_check_congress_counts()
RETURNS TABLE(
  state CHAR(2),
  expected INT,
  actual INT,
  delta INT,
  status TEXT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.state,
    m.expected_total,
    m.actual_total,
    m.delta,
    CASE 
      WHEN m.delta = 0 THEN 'OK'
      WHEN ABS(m.delta) = 1 THEN 'WARNING'
      ELSE 'ERROR'
    END AS status
  FROM v_congress_mismatch m
  ORDER BY ABS(m.delta) DESC, m.state;
END;
$$;