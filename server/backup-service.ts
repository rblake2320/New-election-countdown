import { db } from './db';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, readdir, stat, rename, unlink, chmod } from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import { randomUUID } from 'crypto';
import { join } from 'path';

const execFileAsync = promisify(execFile);

// Connection material is confined to the child environment, never command arguments.
function backupConnectionEnvironment(): NodeJS.ProcessEnv {
  const connection = new URL(process.env.DATABASE_URL ?? '');
  if (!['postgres:', 'postgresql:'].includes(connection.protocol) || !connection.hostname || !connection.pathname.slice(1)) {
    throw new Error('Invalid backup database configuration');
  }
  const env: NodeJS.ProcessEnv = {};
  for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL']) {
    if (process.env[key] !== undefined) env[key] = process.env[key];
  }
  env.PGHOST = connection.hostname.replace(/^\[|\]$/g, '');
  env.PGPORT = connection.port || '5432';
  env.PGDATABASE = decodeURIComponent(connection.pathname.slice(1));
  if (connection.username) env.PGUSER = decodeURIComponent(connection.username);
  if (connection.password) env.PGPASSWORD = decodeURIComponent(connection.password);
  const parameters: Record<string, string> = {
    sslmode: 'PGSSLMODE', sslcert: 'PGSSLCERT', sslkey: 'PGSSLKEY',
    sslrootcert: 'PGSSLROOTCERT', sslcrl: 'PGSSLCRL', sslcrldir: 'PGSSLCRLDIR',
    application_name: 'PGAPPNAME', connect_timeout: 'PGCONNECT_TIMEOUT',
    channel_binding: 'PGCHANNELBINDING', target_session_attrs: 'PGTARGETSESSIONATTRS',
    options: 'PGOPTIONS', gssencmode: 'PGGSSENCMODE',
  };
  for (const [key, value] of connection.searchParams) {
    if (!parameters[key]) throw new Error('Unsupported backup database configuration');
    env[parameters[key]] = value;
  }
  return env;
}

interface BackupConfig {
  schedule: string;
  retentionDays: number;
  backupPath: string;
  compressionEnabled: boolean;
}

export class BackupService {
  private config: BackupConfig = {
    schedule: '0 2 * * *', // Daily at 2 AM
    retentionDays: 30,
    backupPath: './backups',
    compressionEnabled: true
  };

  // Create comprehensive database backup
  async createFullBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `election-tracker-backup-${timestamp}-${randomUUID()}.sql`;
    const backupPath = join(this.config.backupPath, backupFileName);
    const temporaryPath = `${backupPath}.partial`;
    const compressedTemporaryPath = `${backupPath}.gz.partial`;

    try {
      // Ensure backup directory exists
      await mkdir(this.config.backupPath, { recursive: true });

      console.log('Starting full database backup...');

      // Create PostgreSQL dump with data
      await execFileAsync('pg_dump', ['--no-password', '--format=custom', '--file', temporaryPath], {
        env: backupConnectionEnvironment(), shell: false, windowsHide: true,
        timeout: 30 * 60 * 1000, maxBuffer: 1024 * 1024,
      });
      await chmod(temporaryPath, 0o600);

      // Compress if enabled
      if (this.config.compressionEnabled) {
        const compressedPath = `${backupPath}.gz`;
        await pipeline(createReadStream(temporaryPath), createGzip(), createWriteStream(compressedTemporaryPath, { flags: 'wx', mode: 0o600 }));
        await rename(compressedTemporaryPath, compressedPath);
        await unlink(temporaryPath);
        console.log(`Backup compressed: ${compressedPath}`);
        return compressedPath;
      }

      await rename(temporaryPath, backupPath);
      console.log(`Full backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      await Promise.allSettled([unlink(temporaryPath), unlink(compressedTemporaryPath)]);
      console.error('Full database backup failed');
      throw new Error('Full database backup failed');
    }
  }

  // Backup critical user data
  async backupUserData(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `user-data-backup-${timestamp}.json`;
    const backupPath = join(this.config.backupPath, backupFileName);

    try {
      console.log('Backing up user data...');

      // Export user data (excluding sensitive information)
      const userData = await db.execute(`
        SELECT 
          u.id,
          u.email,
          u.created_at,
          up.interests,
          up.notification_preferences,
          COUNT(w.id) as watchlist_count
        FROM users u
        LEFT JOIN user_preferences up ON u.id = up.user_id
        LEFT JOIN watchlists w ON u.id = w.user_id
        GROUP BY u.id, u.email, u.created_at, up.interests, up.notification_preferences
      `);

      // Export watchlist data
      const watchlistData = await db.execute(`
        SELECT 
          w.user_id,
          w.election_id,
          e.title as election_title,
          w.added_at
        FROM watchlists w
        JOIN elections e ON w.election_id = e.id
      `);

      const backupData = {
        timestamp: new Date().toISOString(),
        users: userData.rows,
        watchlists: watchlistData.rows,
        totalUsers: userData.rows.length,
        totalWatchlistItems: watchlistData.rows.length
      };

      await writeFile(backupPath, JSON.stringify(backupData, null, 2));
      console.log(`User data backup created: ${backupPath}`);

      return backupPath;
    } catch (error) {
      console.error('User data backup failed');
      throw new Error('User data backup failed');
    }
  }

  // Backup election results and data
  async backupElectionData(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `election-data-backup-${timestamp}.json`;
    const backupPath = join(this.config.backupPath, backupFileName);

    try {
      console.log('Backing up election data...');

      // Export all election data
      const electionData = await db.execute(`
        SELECT 
          e.*,
          COUNT(c.id) as candidate_count,
          COUNT(w.id) as watchlist_count
        FROM elections e
        LEFT JOIN candidates c ON e.id = c.election_id
        LEFT JOIN watchlists w ON e.id = w.election_id
        GROUP BY e.id
        ORDER BY e.date DESC
      `);

      // Export candidate data
      const candidateData = await db.execute(`
        SELECT 
          c.*,
          e.title as election_title
        FROM candidates c
        JOIN elections e ON c.election_id = e.id
      `);

      const backupData = {
        timestamp: new Date().toISOString(),
        elections: electionData.rows,
        candidates: candidateData.rows,
        totalElections: electionData.rows.length,
        totalCandidates: candidateData.rows.length
      };

      await writeFile(backupPath, JSON.stringify(backupData, null, 2));
      console.log(`Election data backup created: ${backupPath}`);

      return backupPath;
    } catch (error) {
      console.error('Election data backup failed');
      throw new Error('Election data backup failed');
    }
  }

  // Backup campaign analytics (anonymized)
  async backupCampaignAnalytics(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `campaign-analytics-backup-${timestamp}.json`;
    const backupPath = join(this.config.backupPath, backupFileName);

    try {
      console.log('Backing up campaign analytics...');

      // Export campaign accounts (without API keys)
      const campaignData = await db.execute(`
        SELECT 
          id,
          campaign_name,
          candidate_name,
          office_seeking,
          election_id,
          subscription_tier,
          verified_status,
          is_active,
          created_at
        FROM campaign_accounts
      `);

      // Export anonymized access patterns
      const accessData = await db.execute(`
        SELECT 
          DATE(timestamp) as date,
          endpoint_accessed,
          dataset_type,
          COUNT(*) as request_count
        FROM campaign_access_logs
        GROUP BY DATE(timestamp), endpoint_accessed, dataset_type
        ORDER BY date DESC
      `);

      const backupData = {
        timestamp: new Date().toISOString(),
        campaigns: campaignData.rows,
        accessPatterns: accessData.rows,
        totalCampaigns: campaignData.rows.length
      };

      await writeFile(backupPath, JSON.stringify(backupData, null, 2));
      console.log(`Campaign analytics backup created: ${backupPath}`);

      return backupPath;
    } catch (error) {
      console.error('Campaign analytics backup failed');
      throw new Error('Campaign analytics backup failed');
    }
  }

  // Pre-archival backup
  async createPreArchivalBackup(): Promise<string[]> {
    console.log('Creating pre-archival backup...');
    
    try {
      const backupPaths = [];

      // Backup data that will be archived
      const analyticsBackup = await this.backupAnalyticsBeforeArchival();
      backupPaths.push(analyticsBackup);

      // Backup completed elections before archival
      const electionsBackup = await this.backupCompletedElections();
      backupPaths.push(electionsBackup);

      console.log('Pre-archival backup completed');
      return backupPaths;
    } catch (error) {
      console.error('Pre-archival backup failed');
      throw new Error('Pre-archival backup failed');
    }
  }

  private async backupAnalyticsBeforeArchival(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `pre-archival-analytics-${timestamp}.json`;
    const backupPath = join(this.config.backupPath, backupFileName);

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const analyticsData = await db.execute(`
      SELECT 
        il.*,
        em.time_on_page,
        em.scroll_depth,
        em.shares_count
      FROM interaction_logs il
      LEFT JOIN engagement_metrics em ON il.user_id = em.user_id 
        AND DATE(il.timestamp) = DATE(em.created_at)
      WHERE il.timestamp < $1
    `, [ninetyDaysAgo]);

    const backupData = {
      timestamp: new Date().toISOString(),
      archivalCutoff: ninetyDaysAgo.toISOString(),
      analytics: analyticsData.rows,
      totalRecords: analyticsData.rows.length
    };

    await writeFile(backupPath, JSON.stringify(backupData, null, 2));
    return backupPath;
  }

  private async backupCompletedElections(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `completed-elections-${timestamp}.json`;
    const backupPath = join(this.config.backupPath, backupFileName);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const completedElections = await db.execute(`
      SELECT 
        e.*,
        COALESCE(json_agg(c.*) FILTER (WHERE c.id IS NOT NULL), '[]') as candidates
      FROM elections e
      LEFT JOIN candidates c ON e.id = c.election_id
      WHERE e.date < $1 AND e.is_active = false
      GROUP BY e.id
    `, [thirtyDaysAgo]);

    const backupData = {
      timestamp: new Date().toISOString(),
      completionCutoff: thirtyDaysAgo.toISOString(),
      completedElections: completedElections.rows,
      totalElections: completedElections.rows.length
    };

    await writeFile(backupPath, JSON.stringify(backupData, null, 2));
    return backupPath;
  }

  // Get backup status and statistics
  async getBackupStatus(): Promise<any> {
    try {
      const entries = await readdir(this.config.backupPath, { withFileTypes: true });
      const backupFiles = await Promise.all(entries.filter(entry => entry.isFile() && /\.(sql|json)(\.gz)?$/.test(entry.name))
        .map(async entry => ({ name: entry.name, modified: (await stat(join(this.config.backupPath, entry.name))).mtimeMs })));
      backupFiles.sort((a, b) => a.modified - b.modified);

      return {
        backupDirectory: this.config.backupPath,
        totalBackups: backupFiles.length,
        lastBackup: backupFiles.length > 0 ? backupFiles[backupFiles.length - 1].name : 'No backups found',
        config: this.config,
        diskUsage: await this.getBackupDiskUsage()
      };
    } catch (error) {
      console.error('Error getting backup status');
      return { error: 'Unable to retrieve backup status' };
    }
  }

  private async getBackupDiskUsage(): Promise<string> {
    try {
      const entries = await readdir(this.config.backupPath, { withFileTypes: true });
      const sizes = await Promise.all(entries.filter(entry => entry.isFile()).map(async entry => (await stat(join(this.config.backupPath, entry.name))).size));
      return `${sizes.reduce((total, size) => total + size, 0)} bytes`;
    } catch (error) {
      return 'Unknown';
    }
  }

  // Schedule automated backups
  scheduleBackups(): NodeJS.Timeout {
    console.log('Scheduling automated backups...');

    // Run daily backups at 2 AM
    return setInterval(async () => {
      try {
        console.log('Running scheduled backup...');
        
        // Create incremental backups
        await this.backupUserData();
        await this.backupElectionData();
        await this.backupCampaignAnalytics();
        
        // Weekly full backup (Sunday)
        const today = new Date().getDay();
        if (today === 0) {
          await this.createFullBackup();
        }
        
        console.log('Scheduled backup completed');
      } catch (error) {
        console.error('Scheduled backup failed');
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }
}

export const backupService = new BackupService();
