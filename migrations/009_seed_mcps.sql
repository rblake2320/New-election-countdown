-- Seed initial MCPs and authority sources

-- High-trust authority sources
INSERT INTO authority_sources(name, domain, priority, notes)
VALUES 
  ('California Secretary of State', 'sos.ca.gov', 1, 'CA state election authority'),
  ('ProPublica Congress API', 'propublica.org', 2, 'Congressional member data'),
  ('Google Civic Information API', 'google.com', 3, 'Election and candidate data')
ON CONFLICT DO NOTHING;

-- MCP #1: Congress count mismatches (converted from existing code)
INSERT INTO steward_mcp_packs(name, version, active, severity, detector_kind, confidence_threshold, priority_threshold, notes, detector_sql)
VALUES (
  'CONGRESS_MISMATCH', '1.0', true, 2, 'SQL', 0.9000, 1,
  'Detect mismatches between actual and expected congress member counts by state',
  $SQL$
    SELECT 
      e.state,
      e.expected_total,
      COALESCE(a.actual_total, 0) as actual_total,
      COALESCE(a.actual_total, 0) - e.expected_total AS delta,
      0.95::numeric AS confidence,
      1::smallint AS priority
    FROM v_expected_congress_totals e
    LEFT JOIN v_congress_counts_by_state a ON a.state = e.state
    WHERE COALESCE(a.actual_total, 0) != e.expected_total
  $SQL$
) ON CONFLICT (name) DO UPDATE SET detector_sql = EXCLUDED.detector_sql;

-- MCP #2: Zero candidate elections (hotlist)
INSERT INTO steward_mcp_packs(name, version, active, severity, detector_kind, confidence_threshold, priority_threshold, notes, detector_sql)
VALUES (
  'ZERO_CANDIDATE_HOTLIST', '1.0', true, 2, 'SQL', 0.7500, 2,
  'Elections within 45 days with zero candidates',
  $SQL$
    SELECT 
      e.id AS election_id,
      e.title,
      e.state,
      e.date AS election_date,
      0.80::numeric AS confidence,
      2::smallint AS priority
    FROM elections e
    LEFT JOIN candidates c ON c.election_id = e.id
    WHERE e.date <= CURRENT_DATE + INTERVAL '45 days'
      AND e.date >= CURRENT_DATE
    GROUP BY e.id, e.title, e.state, e.date
    HAVING COUNT(c.id) = 0
  $SQL$
) ON CONFLICT (name) DO UPDATE SET detector_sql = EXCLUDED.detector_sql;

-- MCP #3: Priority election coverage
INSERT INTO steward_mcp_packs(name, version, active, severity, detector_kind, confidence_threshold, priority_threshold, notes, detector_sql)
VALUES (
  'PRIORITY_COVERAGE', '1.0', true, 1, 'SQL', 0.8500, 1,
  'Priority elections missing minimum candidate coverage',
  $SQL$
    SELECT 
      p.election_id,
      e.title,
      e.state,
      e.date as election_date,
      p.min_candidates,
      COUNT(c.id) AS candidate_count,
      0.90::numeric AS confidence,
      1::smallint AS priority
    FROM priority_elections p
    JOIN elections e ON e.id = p.election_id
    LEFT JOIN candidates c ON c.election_id = e.id
    WHERE e.date <= CURRENT_DATE + (p.within_days || ' days')::interval
    GROUP BY p.election_id, p.min_candidates, p.within_days, e.title, e.state, e.date
    HAVING COUNT(c.id) < p.min_candidates
  $SQL$
) ON CONFLICT (name) DO UPDATE SET detector_sql = EXCLUDED.detector_sql;

-- MCP #4: Date drift detection (requires authority facts)
INSERT INTO steward_mcp_packs(name, version, active, severity, detector_kind, confidence_threshold, priority_threshold, notes, detector_sql, autofix_sql)
VALUES (
  'DATE_DRIFT', '1.0', true, 2, 'SQL', 0.8000, 2,
  'Elections where local date differs from authoritative source',
  $SQL$
    SELECT 
      e.id AS election_id,
      e.title,
      e.state,
      e.date::date AS local_date,
      a.authoritative_date,
      a.confidence,
      a.priority,
      a.source_url,
      a.confidence AS confidence,
      2::smallint AS priority
    FROM elections e
    JOIN v_authoritative_election_dates a ON a.election_id = e.id
    WHERE e.date::date IS DISTINCT FROM a.authoritative_date
      AND a.confidence >= 0.8
  $SQL$,
  $FIX$
    UPDATE elections
    SET date = a.authoritative_date::timestamptz,
        updated_at = now()
    FROM v_authoritative_election_dates a
    WHERE elections.id = ANY($1) 
      AND a.election_id = elections.id
      AND a.confidence >= 0.9
  $FIX$
) ON CONFLICT (name) DO UPDATE SET 
  detector_sql = EXCLUDED.detector_sql,
  autofix_sql = EXCLUDED.autofix_sql;

-- MCP #5: CA Uniform District compliance
INSERT INTO steward_mcp_packs(name, version, active, severity, detector_kind, confidence_threshold, priority_threshold, notes, detector_sql)
VALUES (
  'CA_UDEL_COMPLIANCE', '1.0', true, 3, 'SQL', 0.7000, 3,
  'California Uniform District Elections not on correct dates',
  $SQL$
    SELECT 
      e.id AS election_id,
      e.title,
      e.date,
      CASE 
        WHEN EXTRACT(YEAR FROM e.date) % 2 = 0 THEN 'Should be November even year'
        ELSE 'Should be March/November odd year'
      END AS issue,
      0.75::numeric AS confidence,
      3::smallint AS priority
    FROM elections e
    WHERE e.state = 'CA'
      AND (e.title ILIKE '%uniform district%' OR e.title ILIKE '%UDEL%')
      AND NOT (
        (EXTRACT(YEAR FROM e.date) % 2 = 0 AND EXTRACT(MONTH FROM e.date) = 11) OR
        (EXTRACT(YEAR FROM e.date) % 2 = 1 AND EXTRACT(MONTH FROM e.date) IN (3, 11))
      )
  $SQL$
) ON CONFLICT (name) DO UPDATE SET detector_sql = EXCLUDED.detector_sql;