import { db } from './db';
import { cacheService } from './cache-service';
import { dataArchivalService } from './data-archival-service';

interface PerformanceMetrics {
  timestamp: Date;
  cacheHitRate: number;
  /** null when pg_stat_statements is not installed: unknown is not 0 ms. */
  avgQueryTime: number | null;
  activeConnections: number;
  memoryUsage: number;
  diskUsage: number;
}

interface AlertConfig {
  cacheHitRateThreshold: number;
  queryTimeThreshold: number;
  errorRateThreshold: number;
  memoryThreshold: number;
}

export class MonitoringService {
  private metrics: PerformanceMetrics[] = [];
  private alerts: AlertConfig = {
    cacheHitRateThreshold: 0.8,  // 80% cache hit rate
    queryTimeThreshold: 1000,    // 1 second max query time
    errorRateThreshold: 0.01,    // 1% error rate
    memoryThreshold: 0.85        // 85% memory usage
  };

  // Collect real-time performance metrics
  async collectMetrics(): Promise<PerformanceMetrics> {
    const timestamp = new Date();
    
    try {
      // Database performance metrics
      const dbStats = await this.getDatabaseStats();
      
      // Cache performance
      const cacheStats = cacheService.getCacheStats();
      const cacheHitRate = this.calculateCacheHitRate(cacheStats);
      
      // System metrics
      const memoryUsage = process.memoryUsage();
      const memoryPercentage = memoryUsage.heapUsed / memoryUsage.heapTotal;
      
      const metrics: PerformanceMetrics = {
        timestamp,
        cacheHitRate,
        avgQueryTime: dbStats.avgQueryTime,
        activeConnections: dbStats.activeConnections,
        memoryUsage: memoryPercentage,
        diskUsage: 0 // Would be implemented with system monitoring
      };
      
      // Store metrics (keep last 1000 entries)
      this.metrics.push(metrics);
      if (this.metrics.length > 1000) {
        this.metrics.shift();
      }
      
      // Check for alerts
      await this.checkAlerts(metrics);
      
      return metrics;
    } catch (error) {
      console.error('Error collecting metrics:', error);
      return {
        timestamp,
        cacheHitRate: 0,
        avgQueryTime: null,
        activeConnections: 0,
        memoryUsage: 0,
        diskUsage: 0
      };
    }
  }

  // Get database performance statistics. pg_stat_statements is an optional extension; when
  // it is absent (as on this deployment) the average query time is unknown, not zero.
  private async getDatabaseStats(): Promise<{ activeConnections: number; avgQueryTime: number | null; bufferHitRatio: number | null }> {
    try {
      const base = await db.execute<{ active_connections: string | number; buffer_hit_ratio: string | number | null; has_stat_statements: boolean }>(`
        SELECT
          (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT SUM(blks_hit) * 100.0 / NULLIF(SUM(blks_hit + blks_read), 0) FROM pg_stat_database) as buffer_hit_ratio,
          EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') as has_stat_statements
      `);
      const row = base.rows[0];
      let avgQueryTime: number | null = null;
      if (row?.has_stat_statements) {
        const q = await db.execute<{ avg_query_time: string | number | null }>(`SELECT AVG(mean_exec_time) as avg_query_time FROM pg_stat_statements WHERE calls > 10`);
        avgQueryTime = q.rows[0]?.avg_query_time == null ? null : Number(q.rows[0].avg_query_time);
      }
      return {
        activeConnections: Number(row?.active_connections ?? 0),
        avgQueryTime,
        bufferHitRatio: row?.buffer_hit_ratio == null ? null : Number(row.buffer_hit_ratio),
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return { activeConnections: 0, avgQueryTime: null, bufferHitRatio: null };
    }
  }

  // Calculate cache hit rate from cache statistics
  private calculateCacheHitRate(cacheStats: any): number {
    if (!cacheStats.hits || !cacheStats.misses) {
      return 0;
    }
    const totalRequests = cacheStats.hits + cacheStats.misses;
    return totalRequests > 0 ? cacheStats.hits / totalRequests : 0;
  }

  // Check for performance alerts
  private async checkAlerts(metrics: PerformanceMetrics): Promise<void> {
    const alerts: Array<{ type: string; message: string; severity: 'warning' | 'critical' }> = [];
    
    if (metrics.cacheHitRate < this.alerts.cacheHitRateThreshold) {
      alerts.push({
        type: 'cache_hit_rate_low',
        message: `Cache hit rate is ${(metrics.cacheHitRate * 100).toFixed(1)}%, below threshold of ${(this.alerts.cacheHitRateThreshold * 100)}%`,
        severity: 'warning'
      });
    }
    
    if (metrics.avgQueryTime !== null && metrics.avgQueryTime > this.alerts.queryTimeThreshold) {
      alerts.push({
        type: 'slow_queries',
        message: `Average query time is ${metrics.avgQueryTime}ms, above threshold of ${this.alerts.queryTimeThreshold}ms`,
        severity: 'critical'
      });
    }
    
    if (metrics.memoryUsage > this.alerts.memoryThreshold) {
      alerts.push({
        type: 'high_memory_usage',
        message: `Memory usage is ${(metrics.memoryUsage * 100).toFixed(1)}%, above threshold of ${(this.alerts.memoryThreshold * 100)}%`,
        severity: 'warning'
      });
    }
    
    // Log alerts (in production, would send to monitoring system)
    if (alerts.length > 0) {
      console.warn('Performance alerts:', alerts);
    }
  }

  // Get monitoring dashboard data
  async getDashboardMetrics(): Promise<any> {
    const currentMetrics = await this.collectMetrics();
    const recentMetrics = this.metrics.slice(-60); // Last hour (assuming 1 minute intervals)
    
    // Archive success rate
    const archivalStats = await dataArchivalService.getArchivalStats();
    
    return {
      current: currentMetrics,
      trends: {
        cacheHitRate: recentMetrics.map(m => ({ time: m.timestamp, value: m.cacheHitRate })),
        queryTime: recentMetrics.map(m => ({ time: m.timestamp, value: m.avgQueryTime })),
        memoryUsage: recentMetrics.map(m => ({ time: m.timestamp, value: m.memoryUsage }))
      },
      archival: archivalStats,
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };
  }

  // Election night specific monitoring, from user_events (session_id, page_path, created_at).
  // The previous queries read user_interactions and api_requests, which do not exist.
  async getElectionNightMetrics(): Promise<{
    concurrentUsers: number;
    requestsLastFiveMinutes: number;
    requestsPerSecond: number;
    topEndpoints: Array<{ endpoint: string; requests: number }>;
    geographicDistribution: { available: false; reason: string };
    cacheEfficiency: number;
    databaseLoad: number | null;
  }> {
    const currentLoad = await this.collectMetrics();

    const sessionStats = await db.execute<{ concurrent_users: string | number; total_requests: string | number }>(`
      SELECT COUNT(DISTINCT session_id) as concurrent_users, COUNT(*) as total_requests
      FROM user_events
      WHERE created_at > NOW() - INTERVAL '5 minutes'
    `);
    const endpointStats = await db.execute<{ endpoint: string; request_count: string | number }>(`
      SELECT page_path as endpoint, COUNT(*) as request_count
      FROM user_events
      WHERE created_at > NOW() - INTERVAL '1 hour'
      GROUP BY page_path
      ORDER BY request_count DESC
      LIMIT 10
    `);
    const recentRequests = await db.execute<{ requests: string | number }>(`
      SELECT COUNT(*) as requests FROM user_events WHERE created_at > NOW() - INTERVAL '1 minute'
    `);

    return {
      concurrentUsers: Number(sessionStats.rows[0]?.concurrent_users ?? 0),
      requestsLastFiveMinutes: Number(sessionStats.rows[0]?.total_requests ?? 0),
      requestsPerSecond: Math.ceil(Number(recentRequests.rows[0]?.requests ?? 0) / 60),
      topEndpoints: endpointStats.rows.map((row) => ({ endpoint: row.endpoint, requests: Number(row.request_count) })),
      // user_events stores an anonymised IP and no region; a made-up 100 % United States
      // split used to be returned here.
      geographicDistribution: { available: false, reason: 'No region is recorded on user_events' },
      cacheEfficiency: currentLoad.cacheHitRate,
      databaseLoad: currentLoad.avgQueryTime
    };
  }

  // Campaign analytics monitoring
  async getCampaignAnalyticsMetrics(): Promise<any> {
    try {
      const campaignStats = await db.execute(`
        SELECT 
          COUNT(*) as total_campaigns,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_campaigns,
          subscription_tier,
          COUNT(*) as tier_count
        FROM campaign_accounts 
        GROUP BY subscription_tier
      `);
      
      const accessStats = await db.execute(`
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as requests,
          COUNT(DISTINCT campaign_id) as unique_campaigns
        FROM campaign_access_logs 
        WHERE timestamp >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `);
      
      return {
        campaigns: campaignStats.rows,
        weeklyAccess: accessStats.rows,
        revenueMetrics: {
          // Calculate based on subscription tiers
          monthlyRecurringRevenue: this.calculateMRR(campaignStats.rows),
          dataExportRevenue: 0 // No data-export sales recorded yet
        }
      };
    } catch (error) {
      console.error('Error getting campaign analytics metrics:', error);
      return {};
    }
  }

  private calculateMRR(campaignStats: Array<Record<string, unknown>>): number {
    const tierPrices = { basic: 99, pro: 499, enterprise: 2499, custom: 5000 };
    let mrr = 0;

    campaignStats.forEach(stat => {
      const price = tierPrices[String(stat.subscription_tier) as keyof typeof tierPrices] || 0;
      mrr += price * Number(stat.tier_count ?? 0);
    });
    
    return mrr;
  }

  // Start monitoring service
  startMonitoring(): NodeJS.Timeout {
    console.log('Starting monitoring service...');
    
    // Collect metrics every minute
    return setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.error('Monitoring collection failed:', error);
      }
    }, 60000);
  }
}

export const monitoringService = new MonitoringService();