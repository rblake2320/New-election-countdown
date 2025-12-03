#!/usr/bin/env node

/**
 * Database backup utility for Election Platform
 * Creates timestamped backups of critical data
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const sql = neon(process.env.DATABASE_URL);

async function createBackup() {
  console.log('🔄 Starting database backup...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups');
  
  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
  
  try {
    // Backup critical tables
    const backup = {
      timestamp: new Date().toISOString(),
      version: '2.1.0',
      tables: {}
    };
    
    // List of tables to backup
    const tables = [
      'elections',
      'candidates',
      'congress_members',
      'steward_mcp_packs',
      'steward_audit_runs',
      'temporal_facts',
      'temporal_truth'
    ];
    
    for (const table of tables) {
      console.log(`  📦 Backing up ${table}...`);
      try {
        const data = await sql(`SELECT * FROM ${table}`);
        backup.tables[table] = {
          count: data.length,
          data: data
        };
        console.log(`     ✅ ${data.length} records`);
      } catch (err) {
        console.log(`     ⚠️ Skipped (${err.message})`);
        backup.tables[table] = {
          error: err.message,
          data: []
        };
      }
    }
    
    // Get database statistics
    const stats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM elections) as elections_count,
        (SELECT COUNT(*) FROM candidates) as candidates_count,
        (SELECT COUNT(*) FROM congress_members) as congress_count,
        (SELECT COUNT(*) FROM steward_mcp_packs) as policies_count
    `;
    
    backup.statistics = stats[0];
    
    // Write backup to file
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    
    console.log(`\n✅ Backup created successfully!`);
    console.log(`📁 Location: ${backupFile}`);
    console.log(`📊 Statistics:`);
    console.log(`   - Elections: ${backup.statistics.elections_count}`);
    console.log(`   - Candidates: ${backup.statistics.candidates_count}`);
    console.log(`   - Congress Members: ${backup.statistics.congress_count}`);
    console.log(`   - Policies: ${backup.statistics.policies_count}`);
    
    // Clean up old backups (keep last 10)
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-'))
      .sort()
      .reverse();
    
    if (backups.length > 10) {
      const toDelete = backups.slice(10);
      toDelete.forEach(file => {
        fs.unlinkSync(path.join(backupDir, file));
        console.log(`   🗑️ Deleted old backup: ${file}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

// Run backup
createBackup().catch(console.error);