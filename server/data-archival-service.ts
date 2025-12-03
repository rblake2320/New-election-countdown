import { db } from './db';
import { 
  interactionLogs, 
  userAnalytics, 
  campaignAccessLogs,
  elections,
  engagementMetrics 
} from '@shared/schema';
import { lt, and, eq } from 'drizzle-orm';

export class DataArchivalService {
  
  // Archive analytics data older than 90 days
  async archiveOldAnalytics(): Promise<void> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    try {
      // Create archive table if it doesn't exist
      await db.execute(`
        CREATE TABLE IF NOT EXISTS interaction_logs_archive (
          LIKE interaction_logs INCLUDING ALL
        )
      `);
      
      // Move old records to archive
      await db.execute(`
        INSERT INTO interaction_logs_archive 
        SELECT * FROM interaction_logs 
        WHERE timestamp < $1
      `, [ninetyDaysAgo]);
      
      // Delete old records from main table
      await db.delete(interactionLogs)
        .where(lt(interactionLogs.timestamp, ninetyDaysAgo));
      
      console.log(`Archived interaction logs older than ${ninetyDaysAgo.toISOString()}`);
    } catch (error) {
      console.error('Error archiving analytics data:', error);
      throw error;
    }
  }

  // Archive completed elections after 30 days
  async archiveCompletedElections(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    try {
      // Create archive table if it doesn't exist
      await db.execute(`
        CREATE TABLE IF NOT EXISTS elections_archive (
          LIKE elections INCLUDING ALL
        )
      `);
      
      // Find completed elections older than 30 days
      const completedElections = await db
        .select()
        .from(elections)
        .where(and(
          lt(elections.date, thirtyDaysAgo),
          eq(elections.isActive, false)
        ));
      
      if (completedElections.length > 0) {
        // Move to archive
        for (const election of completedElections) {
          await db.execute(`
            INSERT INTO elections_archive 
            SELECT * FROM elections WHERE id = $1
          `, [election.id]);
        }
        
        // Keep only summary data in main table
        await db.execute(`
          UPDATE elections 
          SET description = CONCAT('ARCHIVED: ', LEFT(description, 100), '...'),
              offices = ARRAY[]::text[],
              is_active = false
          WHERE date < $1 AND is_active = false
        `, [thirtyDaysAgo]);
        
        console.log(`Archived ${completedElections.length} completed elections`);
      }
    } catch (error) {
      console.error('Error archiving elections:', error);
      throw error;
    }
  }

  // Clean up expired user sessions
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date();
      
      const result = await db.execute(`
        DELETE FROM user_sessions 
        WHERE expires_at < $1
      `, [now]);
      
      console.log(`Cleaned up expired user sessions`);
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      throw error;
    }
  }

  // Aggregate old engagement metrics into summary tables
  async aggregateEngagementMetrics(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    try {
      // Create summary table if it doesn't exist
      await db.execute(`
        CREATE TABLE IF NOT EXISTS engagement_metrics_summary (
          id SERIAL PRIMARY KEY,
          election_cycle_id INTEGER,
          date DATE,
          total_users INTEGER,
          avg_time_on_page INTEGER,
          total_shares INTEGER,
          avg_scroll_depth INTEGER,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Aggregate old data into daily summaries
      await db.execute(`
        INSERT INTO engagement_metrics_summary (
          election_cycle_id, date, total_users, avg_time_on_page, 
          total_shares, avg_scroll_depth
        )
        SELECT 
          election_cycle_id,
          DATE(created_at) as date,
          COUNT(DISTINCT user_id) as total_users,
          AVG(time_on_page) as avg_time_on_page,
          SUM(shares_count) as total_shares,
          AVG(scroll_depth) as avg_scroll_depth
        FROM engagement_metrics 
        WHERE created_at < $1
        GROUP BY election_cycle_id, DATE(created_at)
        ON CONFLICT DO NOTHING
      `, [thirtyDaysAgo]);
      
      // Delete aggregated records
      await db.delete(engagementMetrics)
        .where(lt(engagementMetrics.createdAt, thirtyDaysAgo));
      
      console.log('Aggregated engagement metrics into summary tables');
    } catch (error) {
      console.error('Error aggregating engagement metrics:', error);
      throw error;
    }
  }

  // Run full archival process
  async runFullArchival(): Promise<void> {
    console.log('Starting data archival process...');
    
    try {
      await this.cleanupExpiredSessions();
      await this.aggregateEngagementMetrics();
      await this.archiveOldAnalytics();
      await this.archiveCompletedElections();
      
      console.log('Data archival process completed successfully');
    } catch (error) {
      console.error('Error during archival process:', error);
      throw error;
    }
  }

  // Get archival statistics
  async getArchivalStats(): Promise<any> {
    try {
      const stats = await db.execute(`
        SELECT 
          (SELECT COUNT(*) FROM interaction_logs) as current_interaction_logs,
          (SELECT COUNT(*) FROM interaction_logs_archive) as archived_interaction_logs,
          (SELECT COUNT(*) FROM elections WHERE is_active = true) as active_elections,
          (SELECT COUNT(*) FROM elections_archive) as archived_elections,
          (SELECT COUNT(*) FROM engagement_metrics) as current_engagement_metrics,
          (SELECT COUNT(*) FROM engagement_metrics_summary) as summarized_engagement_metrics
      `);
      
      return stats.rows[0];
    } catch (error) {
      console.error('Error getting archival stats:', error);
      return null;
    }
  }
}

export const dataArchivalService = new DataArchivalService();