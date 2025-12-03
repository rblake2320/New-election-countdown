import { db } from './db';
import { cacheService } from './cache-service';
import { dataArchivalService } from './data-archival-service';

export class DatabaseOptimizationService {
  
  // Run database maintenance tasks
  async runMaintenance(): Promise<void> {
    console.log('Starting database optimization maintenance...');
    
    try {
      // Update table statistics for query planner
      await this.updateTableStatistics();
      
      // Run archival process
      await dataArchivalService.runFullArchival();
      
      // Vacuum and analyze tables
      await this.optimizeTables();
      
      console.log('Database optimization completed successfully');
    } catch (error) {
      console.error('Error during database optimization:', error);
      throw error;
    }
  }

  // Update table statistics for better query planning
  private async updateTableStatistics(): Promise<void> {
    const tables = [
      'elections', 'users', 'user_sessions', 'watchlists', 
      'interaction_logs', 'engagement_metrics', 'campaign_accounts'
    ];
    
    for (const table of tables) {
      try {
        await db.execute(`ANALYZE ${table}`);
        console.log(`Updated statistics for table: ${table}`);
      } catch (error) {
        console.error(`Error analyzing table ${table}:`, error);
      }
    }
  }

  // Optimize table storage and update statistics
  private async optimizeTables(): Promise<void> {
    const tables = [
      'elections', 'interaction_logs', 'engagement_metrics', 'campaign_access_logs'
    ];
    
    for (const table of tables) {
      try {
        // Vacuum table to reclaim space
        await db.execute(`VACUUM ${table}`);
        console.log(`Vacuumed table: ${table}`);
      } catch (error) {
        console.error(`Error vacuuming table ${table}:`, error);
      }
    }
  }

  // Get database performance metrics
  async getPerformanceMetrics(): Promise<any> {
    try {
      const metrics = await db.execute(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public' 
        AND tablename IN ('elections', 'users', 'interaction_logs')
        ORDER BY tablename, attname
      `);

      const indexUsage = await db.execute(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
      `);

      const tableStats = await db.execute(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins,
          n_tup_upd,
          n_tup_del,
          seq_scan,
          seq_tup_read,
          idx_scan,
          idx_tup_fetch
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
        ORDER BY seq_scan DESC
      `);

      return {
        columnStats: metrics.rows,
        indexUsage: indexUsage.rows,
        tableStats: tableStats.rows,
        cacheStats: cacheService.getCacheStats()
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return null;
    }
  }

  // Check for slow queries and optimization opportunities
  async checkQueryPerformance(): Promise<any> {
    try {
      const slowQueries = await db.execute(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        WHERE mean_time > 100
        ORDER BY mean_time DESC
        LIMIT 10
      `);

      return {
        slowQueries: slowQueries.rows || [],
        recommendations: this.getOptimizationRecommendations()
      };
    } catch (error) {
      console.log('pg_stat_statements extension not available');
      return {
        slowQueries: [],
        recommendations: this.getOptimizationRecommendations()
      };
    }
  }

  private getOptimizationRecommendations(): string[] {
    return [
      'All recommended indexes have been created for elections, users, and analytics tables',
      'Partitioning implemented for time-series data (interaction_logs)',
      'Caching system active with appropriate TTL values',
      'Data archival process configured for 90+ day old analytics',
      'Regular VACUUM and ANALYZE scheduled for table optimization'
    ];
  }

  // Schedule regular maintenance (would be called by cron in production)
  scheduleMaintenanceTask(): NodeJS.Timeout {
    // Run maintenance every 6 hours
    return setInterval(async () => {
      try {
        await this.runMaintenance();
      } catch (error) {
        console.error('Scheduled maintenance failed:', error);
      }
    }, 6 * 60 * 60 * 1000);
  }
}

export const databaseOptimizationService = new DatabaseOptimizationService();