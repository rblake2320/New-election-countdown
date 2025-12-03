import { db } from './db';
import { cacheService } from './cache-service';
import { db } from './db';
import { dataArchivalService } from './data-archival-service';

interface PerformanceMetrics {
  timestamp: Date;
  cacheHitRate: number;
  avgQueryTime: number;
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
        avgQueryTime: dbStats.avgQueryTime || 0,
        activeConnections: dbStats.activeConnections || 0,
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
        avgQueryTime: 0,
        activeConnections: 0,
        memoryUsage: 0,
        diskUsage: 0
      };
    }
  }

  // Get database performance statistics
  private async getDatabaseStats(): Promise<any> {
    try {
      const stats = await db.execute(`
        SELECT 
          (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT AVG(mean_exec_time) FROM pg_stat_statements WHERE calls > 10) as avg_query_time,
          (SELECT SUM(blks_hit) * 100.0 / SUM(blks_hit + blks_read) FROM pg_stat_database) as buffer_hit_ratio
      `);
      
      return stats.rows[0] || {};
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {};
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
    const alerts = [];
    
    if (metrics.cacheHitRate < this.alerts.cacheHitRateThreshold) {
      alerts.push({
        type: 'cache_hit_rate_low',
        message: `Cache hit rate is ${(metrics.cacheHitRate * 100).toFixed(1)}%, below threshold of ${(this.alerts.cacheHitRateThreshold * 100)}%`,
        severity: 'warning'
      });
    }
    
    if (metrics.avgQueryTime > this.alerts.queryTimeThreshold) {
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

  // Election night specific monitoring
  async getElectionNightMetrics(): Promise<any> {
    const currentLoad = await this.collectMetrics();
    
    // Get real user session data
    const sessionStats = await db.execute(`
      SELECT 
        COUNT(DISTINCT session_id) as concurrent_users,
        COUNT(*) as total_requests
      FROM user_interactions 
      WHERE timestamp > NOW() - INTERVAL '5 minutes'
    `);

    // Get actual endpoint usage stats
    const endpointStats = await db.execute(`
      SELECT 
        endpoint,
        COUNT(*) as request_count
      FROM api_requests 
      WHERE timestamp > NOW() - INTERVAL '1 hour'
      GROUP BY endpoint
      ORDER BY request_count DESC
      LIMIT 10
    `);

    // Calculate requests per second from recent activity
    const recentRequests = await db.execute(`
      SELECT COUNT(*) as requests
      FROM api_requests 
      WHERE timestamp > NOW() - INTERVAL '1 minute'
    `);

    const electionNightMetrics = {
      concurrentUsers: sessionStats.rows[0]?.concurrent_users || 0,
      requestsPerSecond: Math.ceil((recentRequests.rows[0]?.requests || 0) / 60),
      topEndpoints: endpointStats.rows.map(row => ({
        endpoint: row.endpoint,
        requests: row.request_count
      })),
      geographicDistribution: await this.getGeographicDistribution(),
      cacheEfficiency: currentLoad.cacheHitRate,
      databaseLoad: currentLoad.avgQueryTime
    };
    
    return electionNightMetrics;
  }

  private async getGeographicDistribution(): Promise<any> {
    try {
      const geoStats = await db.execute(`
        SELECT 
          CASE 
            WHEN location ~ '^[A-Z]{2}$' THEN 'United States'
            ELSE 'International'
          END as region,
          COUNT(*) as count
        FROM user_interactions 
        WHERE timestamp > NOW() - INTERVAL '1 hour'
        GROUP BY region
      `);

      const total = geoStats.rows.reduce((sum, row) => sum + (row.count || 0), 0);
      const distribution = {};
      
      geoStats.rows.forEach(row => {
        distribution[row.region] = total > 0 ? Math.round((row.count / total) * 100) : 0;
      });

      return distribution;
    } catch (error) {
      console.error('Error getting geographic distribution:', error);
      return { 'United States': 100, 'International': 0 };
    }
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
          dataExportRevenue: Math.floor(Math.random() * 50000) + 10000 // Simulated
        }
      };
    } catch (error) {
      console.error('Error getting campaign analytics metrics:', error);
      return {};
    }
  }

  private calculateMRR(campaignStats: any[]): number {
    const tierPrices = { basic: 99, pro: 499, enterprise: 2499, custom: 5000 };
    let mrr = 0;
    
    campaignStats.forEach(stat => {
      const price = tierPrices[stat.subscription_tier as keyof typeof tierPrices] || 0;
      mrr += price * stat.tier_count;
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