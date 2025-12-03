-- Data Protection Backup: All 574 elections as of current state
-- This backup prevents accidental data loss and disconnection

CREATE TABLE IF NOT EXISTS elections_backup AS 
SELECT * FROM elections WHERE is_active = true;

-- Verify backup count
SELECT 
    'Original elections' as source, COUNT(*) as count 
FROM elections WHERE is_active = true
UNION ALL
SELECT 
    'Backup elections' as source, COUNT(*) as count 
FROM elections_backup;

-- Distribution verification
SELECT 
    'Original' as source, level, COUNT(*) as count
FROM elections WHERE is_active = true GROUP BY level
UNION ALL
SELECT 
    'Backup' as source, level, COUNT(*) as count  
FROM elections_backup GROUP BY level
ORDER BY source, level;