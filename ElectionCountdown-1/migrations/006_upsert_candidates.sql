-- Universal candidate upsert function that works with current schema

CREATE OR REPLACE FUNCTION upsert_candidates_for_title(
  p_title TEXT,
  p_state CHAR(2),
  p_date DATE,              -- expected election day (helps disambiguate)
  p_payload JSONB           -- [{ "name":"...", "party":"...", "incumbent":true, "image": "..." }, ...]
)
RETURNS JSONB 
LANGUAGE plpgsql AS $$
DECLARE
  v_election_id BIGINT;
  rec JSONB;
  c_id BIGINT;
  linked INT := 0;
  created INT := 0;
BEGIN
  -- Find the election by title, state, and optional date
  SELECT id INTO v_election_id
  FROM elections
  WHERE state = p_state
    AND (
      title ILIKE p_title 
      OR title ILIKE '%' || p_title || '%'
      OR title ILIKE '%mayor%' AND p_title ILIKE '%mayor%'
    )
    AND (
      p_date IS NULL 
      OR date::DATE = p_date 
      OR ABS(EXTRACT(EPOCH FROM (date - p_date::TIMESTAMPTZ))) < 7 * 86400  -- Within 7 days
    )
  ORDER BY 
    CASE WHEN date::DATE = p_date THEN 0 ELSE 1 END,
    id
  LIMIT 1;

  IF v_election_id IS NULL THEN
    -- Try harder to find mayoral elections
    IF p_title ILIKE '%mayor%' THEN
      SELECT id INTO v_election_id
      FROM elections
      WHERE state = p_state
        AND level = 'Local'
        AND (
          title ILIKE '%' || SPLIT_PART(p_title, ' ', 1) || '%'
          OR location ILIKE '%' || SPLIT_PART(p_title, ' ', 1) || '%'
        )
        AND date::DATE BETWEEN '2025-11-01' AND '2025-11-10'
      LIMIT 1;
    END IF;
    
    IF v_election_id IS NULL THEN
      RAISE NOTICE 'Election not found for title=%, state=%, date=%', p_title, p_state, p_date;
      RETURN jsonb_build_object(
        'error', 'Election not found',
        'title', p_title,
        'state', p_state,
        'date', p_date
      );
    END IF;
  END IF;

  -- Process each candidate in the payload
  FOR rec IN SELECT * FROM jsonb_array_elements(p_payload)
  LOOP
    -- Find or create candidate by name and state
    SELECT id INTO c_id 
    FROM candidates
    WHERE LOWER(name) = LOWER(rec->>'name') 
      AND state = p_state 
    LIMIT 1;

    IF c_id IS NULL THEN
      INSERT INTO candidates(
        name, party, state, incumbent, profile_image_url, 
        election_id, created_at, updated_at
      )
      VALUES (
        rec->>'name', 
        rec->>'party', 
        p_state, 
        COALESCE((rec->>'incumbent')::BOOLEAN, FALSE), 
        rec->>'image',
        v_election_id,
        now(),
        now()
      )
      RETURNING id INTO c_id;
      created := created + 1;
    ELSE
      -- Update existing candidate
      UPDATE candidates
      SET 
        party = COALESCE(NULLIF(rec->>'party',''), party),
        incumbent = COALESCE((rec->>'incumbent')::BOOLEAN, incumbent),
        profile_image_url = COALESCE(NULLIF(rec->>'image',''), profile_image_url),
        election_id = v_election_id,
        updated_at = now()
      WHERE id = c_id;
    END IF;

    linked := linked + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'election_id', v_election_id,
    'candidates_created', created,
    'candidates_linked', linked,
    'success', true
  );
END;
$$;

-- Helper to find mayoral elections for major cities
CREATE OR REPLACE FUNCTION find_mayoral_elections(p_year INT DEFAULT 2025)
RETURNS TABLE(
  id BIGINT,
  title TEXT,
  location TEXT,
  state CHAR(2),
  date DATE,
  candidate_count BIGINT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.location,
    e.state,
    e.date::DATE,
    COUNT(c.id) as candidate_count
  FROM elections e
  LEFT JOIN candidates c ON c.election_id = e.id
  WHERE e.level = 'Local'
    AND EXTRACT(YEAR FROM e.date) = p_year
    AND (
      e.title ILIKE '%mayor%'
      OR e.office ILIKE '%mayor%'
      OR e.title ILIKE '%boston%'
      OR e.title ILIKE '%seattle%'
      OR e.title ILIKE '%atlanta%'
      OR e.title ILIKE '%detroit%'
    )
  GROUP BY e.id, e.title, e.location, e.state, e.date
  ORDER BY e.date, e.state, e.title;
END;
$$;