/**
 * Advanced Production Monitoring Service
 * Provides real-time monitoring, error tracking, and alerting
 */

export interface SystemMetrics {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
  lastError?: string;
  lastErrorTime?: Date;
  dbStatus: 'healthy' | 'degraded' | 'offline';
  apiStatus: {
    openfec: boolean;
    google_civic: boolean;
    propublica: boolean;
  };
}

export interface AlertConfig {
  errorRate: number; // Alert if error rate > threshold
  responseTime: number; // Alert if avg response time > threshold ms
  memoryThreshold: number; // Alert if memory usage > threshold MB
  diskThreshold: number; // Alert if disk usage > threshold %
}

class MonitoringService {
  private metrics: SystemMetrics = {
    uptime: 0,
    memoryUsage: process.memoryUsage(),
    cpuUsage: 0,
    requestCount: 0,
    errorCount: 0,
    avgResponseTime: 0,
    dbStatus: 'offline',
    apiStatus: {
      openfec: false,
      google_civic: false,
      propublica: false
    }
  };

  private requestTimes: number[] = [];
  private alertConfig: AlertConfig = {
    errorRate: 5, // 5% error rate threshold
    responseTime: 2000, // 2 second response time threshold
    memoryThreshold: 512, // 512MB memory threshold
    diskThreshold: 80 // 80% disk usage threshold
  };

  private alerts: string[] = [];
  private startTime = Date.now();

  constructor() {
    this.startPeriodicMetrics();
  }

  /**
   * Record incoming HTTP request
   */
  recordRequest(responseTime: number): void {
    this.metrics.requestCount++;
    this.requestTimes.push(responseTime);
    
    // Keep only last 1000 request times
    if (this.requestTimes.length > 1000) {
      this.requestTimes.shift();
    }
    
    // Update average response time
    this.metrics.avgResponseTime = 
      this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;
  }

  /**
   * Record system error
   */
  recordError(error: string): void {
    this.metrics.errorCount++;
    this.metrics.lastError = error;
    this.metrics.lastErrorTime = new Date();
    
    console.error(`🚨 System Error: ${error}`);
    
    // Check if error rate exceeds threshold
    const errorRate = (this.metrics.errorCount / this.metrics.requestCount) * 100;
    if (errorRate > this.alertConfig.errorRate) {
      this.triggerAlert(`High error rate detected: ${errorRate.toFixed(2)}%`);
    }
  }

  /**
   * Update database status
   */
  updateDatabaseStatus(status: 'healthy' | 'degraded' | 'offline'): void {
    const previousStatus = this.metrics.dbStatus;
    this.metrics.dbStatus = status;
    
    if (previousStatus !== status) {
      console.log(`📊 Database status changed: ${previousStatus} → ${status}`);
      
      if (status === 'offline') {
        this.triggerAlert('Database connection lost');
      } else if (status === 'healthy' && previousStatus === 'offline') {
        console.log('✅ Database connection restored');
      }
    }
  }

  /**
   * Update API service status
   */
  updateApiStatus(service: keyof SystemMetrics['apiStatus'], isHealthy: boolean): void {
    const previousStatus = this.metrics.apiStatus[service];
    this.metrics.apiStatus[service] = isHealthy;
    
    if (previousStatus !== isHealthy) {
      console.log(`🔗 ${service.toUpperCase()} API status: ${isHealthy ? 'healthy' : 'degraded'}`);
      
      if (!isHealthy) {
        this.triggerAlert(`${service.toUpperCase()} API service degraded`);
      }
    }
  }

  /**
   * Get current system metrics
   */
  getMetrics(): SystemMetrics {
    return {
      ...this.metrics,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Get system health score (0-100)
   */
  getHealthScore(): number {
    let score = 100;
    
    // Penalize based on error rate
    const errorRate = this.metrics.requestCount > 0 
      ? (this.metrics.errorCount / this.metrics.requestCount) * 100 
      : 0;
    score -= Math.min(errorRate * 10, 50);
    
    // Penalize based on response time
    if (this.metrics.avgResponseTime > this.alertConfig.responseTime) {
      score -= 20;
    }
    
    // Penalize based on database status
    if (this.metrics.dbStatus === 'offline') {
      score -= 30;
    } else if (this.metrics.dbStatus === 'degraded') {
      score -= 15;
    }
    
    // Penalize based on API status
    const apiServices = Object.values(this.metrics.apiStatus);
    const unhealthyApis = apiServices.filter(status => !status).length;
    score -= unhealthyApis * 10;
    
    return Math.max(score, 0);
  }

  /**
   * Get recent alerts
   */
  getAlerts(): string[] {
    return [...this.alerts];
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Trigger system alert
   */
  private triggerAlert(message: string): void {
    const timestamp = new Date().toISOString();
    const alertMessage = `[${timestamp}] ${message}`;
    
    this.alerts.push(alertMessage);
    console.warn(`🚨 ALERT: ${message}`);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
  }

  /**
   * Start periodic metric collection
   */
  private startPeriodicMetrics(): void {
    setInterval(() => {
      // Update memory usage
      this.metrics.memoryUsage = process.memoryUsage();
      
      // Check memory threshold
      const memoryMB = this.metrics.memoryUsage.heapUsed / 1024 / 1024;
      if (memoryMB > this.alertConfig.memoryThreshold) {
        this.triggerAlert(`High memory usage: ${memoryMB.toFixed(2)}MB`);
      }
      
      // Update uptime
      this.metrics.uptime = Math.floor((Date.now() - this.startTime) / 1000);
      
    }, 30000); // Every 30 seconds
  }

  /**
   * Express middleware for request monitoring
   */
  expressMiddleware() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        this.recordRequest(responseTime);
        
        // Record errors for 4xx and 5xx status codes
        if (res.statusCode >= 400) {
          this.recordError(`HTTP ${res.statusCode} ${req.method} ${req.url}`);
        }
      });
      
      next();
    };
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();
export default monitoringService;