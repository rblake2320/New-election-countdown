-- Fix Sonoma County Uniform District Election Date
-- Correct date should be November 4, 2025, not August 25, 2025

-- First, find the Sonoma County election(s)
DO $$
DECLARE
  v_election_id BIGINT;
  v_source_id UUID;
  v_fact_id BIGINT;
BEGIN
  -- Get the Sonoma County ROV source
  SELECT id INTO v_source_id
  FROM sources
  WHERE name = 'Sonoma County ROV'
  LIMIT 1;
  
  -- Find elections that might be the Sonoma County UDEL with wrong date
  FOR v_election_id IN
    SELECT id 
    FROM elections
    WHERE state = 'CA'
      AND level = 'Local'
      AND (
        title ILIKE '%sonoma%'
        OR title ILIKE '%uniform district%'
        OR location ILIKE '%sonoma%'
      )
      AND date::DATE = '2025-08-25'  -- Wrong date
  LOOP
    -- Record the correction as a fact
    INSERT INTO election_facts(
      election_id, 
      fact_type, 
      fact_value, 
      source_id, 
      source_url,
      confidence,
      verified_at,
      verifier_name
    ) VALUES (
      v_election_id,
      'date',
      jsonb_build_object(
        'date', '2025-11-04',
        'timezone', 'America/Los_Angeles',
        'description', 'November 4, 2025, Uniform District Election'
      ),
      v_source_id,
      'https://sonomacounty.gov/administrative-support-and-fiscal-services/registrar-of-voters/elections/november-4-2025-uniform-district-election-basic-timeline',
      95,
      now(),
      'Official County Website'
    );
    
    -- Update or insert into election_truth
    INSERT INTO election_truth(
      election_id,
      date_utc,
      jurisdiction,
      office,
      district,
      status,
      confidence,
      lock_reason,
      updated_by
    ) VALUES (
      v_election_id,
      '2025-11-04 08:00:00-08'::TIMESTAMPTZ,  -- November 4, 2025 in PST
      'Sonoma County',
      'Uniform District Election',
      NULL,
      'scheduled',
      95,
      'County Registrar Official Timeline - CA UDEL Rule',
      'System Migration'
    )
    ON CONFLICT (election_id) DO UPDATE
    SET 
      date_utc = EXCLUDED.date_utc,
      lock_reason = EXCLUDED.lock_reason,
      confidence = EXCLUDED.confidence,
      updated_at = now(),
      updated_by = EXCLUDED.updated_by;
    
    -- Record the version change
    INSERT INTO election_date_versions(
      election_id,
      date_from,
      date_to,
      change_reason,
      source_id,
      changed_by
    ) VALUES (
      v_election_id,
      '2025-08-25 07:00:00-08'::TIMESTAMPTZ,  -- Old wrong date
      '2025-11-04 08:00:00-08'::TIMESTAMPTZ,  -- New correct date
      'Correction based on Sonoma County ROV official timeline - CA Uniform District Elections are held on first Tuesday after first Monday in November of odd years',
      v_source_id,
      'System Migration'
    );
    
    -- Update the actual election date
    UPDATE elections
    SET date = '2025-11-04 08:00:00-08'::TIMESTAMPTZ
    WHERE id = v_election_id;
    
    RAISE NOTICE 'Fixed Sonoma County election ID %: date changed from 2025-08-25 to 2025-11-04', v_election_id;
  END LOOP;
  
  -- Also fix any other CA local elections on August 25, 2025 (likely also wrong UDEL dates)
  FOR v_election_id IN
    SELECT id 
    FROM elections
    WHERE state = 'CA'
      AND level = 'Local'
      AND date::DATE = '2025-08-25'
      AND (
        title ILIKE '%uniform%' 
        OR title ILIKE '%district%'
        OR title ILIKE '%special district%'
        OR title ILIKE '%water%'
        OR title ILIKE '%fire%'
        OR title ILIKE '%school%'
      )
  LOOP
    -- Record as likely UDEL date correction
    INSERT INTO election_truth(
      election_id,
      date_utc,
      jurisdiction,
      office,
      district,
      status,
      confidence,
      lock_reason,
      updated_by
    ) VALUES (
      v_election_id,
      '2025-11-04 08:00:00-08'::TIMESTAMPTZ,
      'California',
      'Uniform District Election',
      NULL,
      'scheduled',
      85,
      'CA UDEL Rule - Uniform District Elections in odd years occur first Tuesday after first Monday in November',
      'System Migration'
    )
    ON CONFLICT (election_id) DO UPDATE
    SET 
      date_utc = EXCLUDED.date_utc,
      lock_reason = EXCLUDED.lock_reason,
      confidence = EXCLUDED.confidence,
      updated_at = now(),
      updated_by = EXCLUDED.updated_by;
    
    -- Update the election date
    UPDATE elections
    SET date = '2025-11-04 08:00:00-08'::TIMESTAMPTZ
    WHERE id = v_election_id;
    
    RAISE NOTICE 'Fixed CA local election ID % (likely UDEL): date changed from 2025-08-25 to 2025-11-04', v_election_id;
  END LOOP;
END $$;

-- Create a view to monitor CA UDEL compliance
CREATE OR REPLACE VIEW ca_udel_compliance AS
SELECT 
  e.id,
  e.title,
  e.date,
  e.location,
  CASE 
    WHEN is_ca_udel_date(e.date::DATE) THEN 'Compliant'
    ELSE 'Non-compliant'
  END as udel_status,
  et.lock_reason,
  et.confidence
FROM elections e
LEFT JOIN election_truth et ON et.election_id = e.id
WHERE e.state = 'CA'
  AND e.level = 'Local'
  AND (
    e.title ILIKE '%uniform%'
    OR e.title ILIKE '%district%'
    OR e.title ILIKE '%special%'
  )
ORDER BY e.date, e.title;