/**
 * RTO/RPO Performance Dashboard Service
 * Real-time monitoring and historical analysis of Recovery Time/Point Objectives
 * Provides performance benchmarking and compliance tracking
 */

import {
  RtoRpoTarget,
  RtoRpoMeasurement,
  PerformanceBenchmark,
  InsertRtoRpoMeasurement,
  BackupOperation,
  DrillExecution
} from '@shared/schema';

export interface RtoRpoPerformanceMetrics {
  targetId: number;
  targetName: string;
  serviceType: string;
  component?: string;
  businessCriticality: string;
  
  // Current metrics
  currentRto: number | null;
  currentRpo: number | null;
  rtoTargetSeconds: number;
  rpoTargetSeconds: number;
  
  // Compliance status
  rtoCompliant: boolean;
  rpoCompliant: boolean;
  overallCompliant: boolean;
  complianceScore: number; // 0-100%
  
  // Historical performance
  avgRto30d: number;
  avgRpo30d: number;
  rtoTrend: 'improving' | 'stable' | 'degrading';
  rpoTrend: 'improving' | 'stable' | 'degrading';
  
  // Measurement counts
  totalMeasurements: number;
  successfulMeasurements: number;
  measurementSuccessRate: number;
  
  // Risk indicators
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastMeasurement?: Date;
  lastIncident?: Date;
}

export interface ServicePerformanceSummary {
  serviceType: string;
  componentsCount: number;
  targetsCount: number;
  
  // Aggregated metrics
  overallRtoCompliance: number; // Percentage
  overallRpoCompliance: number; // Percentage
  averageRto: number;
  averageRpo: number;
  
  // Performance indicators
  performingWell: number; // Count of compliant targets
  needsAttention: number; // Count of non-compliant targets
  criticalIssues: number; // Count of critical risk targets
  
  // Trends
  performanceTrend: 'improving' | 'stable' | 'degrading';
  complianceHistory: Array<{
    date: Date;
    rtoCompliance: number;
    rpoCompliance: number;
  }>;
}

export interface BenchmarkComparison {
  targetId: number;
  targetName: string;
  serviceType: string;
  industry: string;
  
  // Current performance vs benchmarks
  currentRto: number;
  currentRpo: number;
  industryMedianRto: number;
  industryMedianRpo: number;
  
  // Performance ratings
  rtoPerformance: 'excellent' | 'good' | 'average' | 'poor';
  rpoPerformance: 'excellent' | 'good' | 'average' | 'poor';
  overallRating: 'excellent' | 'good' | 'average' | 'poor';
  
  // Improvement opportunities
  rtoImprovementOpportunity: number; // Seconds that could be improved
  rpoImprovementOpportunity: number; // Seconds that could be improved
  recommendedActions: string[];
}

export interface DashboardData {
  overview: {
    totalTargets: number;
    compliantTargets: number;
    complianceRate: number;
    avgRto: number;
    avgRpo: number;
    overallHealthScore: number;
  };
  
  servicePerformance: ServicePerformanceSummary[];
  targetMetrics: RtoRpoPerformanceMetrics[];
  benchmarkComparisons: BenchmarkComparison[];
  
  recentMeasurements: RtoRpoMeasurement[];
  alerts: Array<{
    type: 'sla_breach' | 'performance_degradation' | 'missing_measurement';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    targetId?: number;
    timestamp: Date;
  }>;
  
  trends: {
    rtoTrend: Array<{ date: Date; value: number }>;
    rpoTrend: Array<{ date: Date; value: number }>;
    complianceTrend: Array<{ date: Date; rtoCompliance: number; rpoCompliance: number }>;
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'sla_breach' | 'performance_degradation' | 'missing_measurement' | 'benchmark_deviation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  targetId: number;
  message: string;
  details: any;
  createdAt: Date;
  acknowledged: boolean;
}

export class RtoRpoPerformanceDashboardService {
  private isRunning: boolean = false;
  private performanceCache: Map<number, RtoRpoPerformanceMetrics> = new Map();
  private alertsCache: PerformanceAlert[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private metricsUpdateInterval?: NodeJS.Timeout;

  constructor() {
    console.log('✅ RTO/RPO Performance Dashboard Service initialized');
  }

  /**
   * Start the performance dashboard service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ RTO/RPO Performance Dashboard Service already running');
      return;
    }

    console.log('🚀 Starting RTO/RPO Performance Dashboard Service');

    try {
      // Initialize performance metrics
      await this.initializePerformanceMetrics();
      
      // Start monitoring and update intervals
      await this.startMonitoringLoops();

      this.isRunning = true;
      console.log('✅ RTO/RPO Performance Dashboard Service started successfully');

    } catch (error) {
      console.error('❌ Failed to start RTO/RPO Performance Dashboard Service:', error);
      throw error;
    }
  }

  /**
   * Stop the performance dashboard service
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping RTO/RPO Performance Dashboard Service');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
    }

    this.performanceCache.clear();
    this.alertsCache = [];
    this.isRunning = false;
    
    console.log('✅ RTO/RPO Performance Dashboard Service stopped');
  }

  /**
   * Record new RTO/RPO measurement
   */
  async recordMeasurement(
    targetId: number,
    measurementType: 'drill' | 'real_incident' | 'automated_test',
    actualRtoSeconds: number,
    actualRpoSeconds: number,
    context: {
      drillExecutionId?: number;
      backupOperationId?: number;
      incidentId?: string;
      triggeredBy?: string;
      metadata?: any;
    }
  ): Promise<RtoRpoMeasurement> {
    console.log(`📊 Recording RTO/RPO measurement for target ${targetId}: RTO=${actualRtoSeconds}s, RPO=${actualRpoSeconds}s`);

    try {
      const { storage } = await import('../storage');
      
      // Get target details
      const target = await storage.getRtoRpoTarget(targetId);
      if (!target) {
        throw new Error(`RTO/RPO target ${targetId} not found`);
      }

      // Calculate compliance
      const rtoAchieved = actualRtoSeconds <= target.rtoTargetSeconds;
      const rpoAchieved = actualRpoSeconds <= target.rpoTargetSeconds;
      const rtoVariance = actualRtoSeconds - target.rtoTargetSeconds;
      const rpoVariance = actualRpoSeconds - target.rpoTargetSeconds;

      // Create measurement record
      const measurement: InsertRtoRpoMeasurement = {
        measurementId: `measurement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        targetId,
        measurementType,
        actualRtoSeconds,
        actualRpoSeconds,
        rtoAchieved,
        rpoAchieved,
        rtoVariance,
        rpoVariance,
        drillExecutionId: context.drillExecutionId,
        backupOperationId: context.backupOperationId,
        performanceMetrics: {
          measurementContext: measurementType,
          incidentId: context.incidentId,
          triggeredBy: context.triggeredBy,
          metadata: context.metadata
        },
        dataIntegrityScore: this.calculateDataIntegrityScore(context),
        performanceScore: this.calculatePerformanceScore(rtoAchieved, rpoAchieved, rtoVariance, rpoVariance),
        overallScore: this.calculateOverallScore(rtoAchieved, rpoAchieved, rtoVariance, rpoVariance),
        measuredBy: context.triggeredBy || 'system',
        notes: `${measurementType} measurement - RTO: ${rtoAchieved ? 'PASS' : 'FAIL'}, RPO: ${rpoAchieved ? 'PASS' : 'FAIL'}`
      };

      const createdMeasurement = await storage.createRtoRpoMeasurement(measurement);

      // Update performance cache
      await this.updatePerformanceMetrics(targetId);

      // Check for SLA breaches and generate alerts
      await this.checkSlaCompliance(target, createdMeasurement);

      return createdMeasurement;

    } catch (error) {
      console.error(`Failed to record RTO/RPO measurement:`, error);
      throw error;
    }
  }

  /**
   * Get complete dashboard data
   */
  async getDashboardData(filters?: {
    serviceType?: string;
    businessCriticality?: string;
    complianceStatus?: 'compliant' | 'non_compliant' | 'all';
    days?: number;
  }): Promise<DashboardData> {
    console.log('📊 Generating RTO/RPO dashboard data');

    try {
      const { storage } = await import('../storage');
      const days = filters?.days || 30;
      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get targets and measurements
      const targets = await storage.getRtoRpoTargets({ 
        active: true,
        serviceType: filters?.serviceType,
        businessCriticality: filters?.businessCriticality
      });

      const measurements = await storage.getRtoRpoMeasurements({
        dateFrom,
        dateTo: new Date()
      });

      // Calculate overview metrics
      const overview = await this.calculateOverviewMetrics(targets, measurements);

      // Generate service performance summaries
      const servicePerformance = await this.generateServicePerformanceSummaries(targets, measurements);

      // Get target metrics (from cache or calculate)
      const targetMetrics = await this.getTargetMetrics(targets, filters);

      // Generate benchmark comparisons
      const benchmarkComparisons = await this.generateBenchmarkComparisons(targets, measurements);

      // Get recent measurements
      const recentMeasurements = await storage.getRecentRtoRpoMeasurements(20);

      // Generate trends
      const trends = await this.generateTrends(targets, measurements, days);

      return {
        overview,
        servicePerformance,
        targetMetrics,
        benchmarkComparisons,
        recentMeasurements,
        alerts: this.alertsCache,
        trends
      };

    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get performance report for specific target
   */
  async getTargetPerformanceReport(
    targetId: number,
    days: number = 90
  ): Promise<{
    target: RtoRpoTarget;
    metrics: RtoRpoPerformanceMetrics;
    measurements: RtoRpoMeasurement[];
    trends: any;
    benchmarks: BenchmarkComparison | null;
    recommendations: string[];
  }> {
    try {
      const { storage } = await import('../storage');
      
      const target = await storage.getRtoRpoTarget(targetId);
      if (!target) {
        throw new Error(`Target ${targetId} not found`);
      }

      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const measurements = await storage.getRtoRpoMeasurementsByTarget(targetId);
      const recentMeasurements = measurements.filter(m => 
        new Date(m.createdAt) >= dateFrom
      );

      const metrics = await this.calculateTargetMetrics(target, recentMeasurements);
      const trends = await this.calculateTargetTrends(target, recentMeasurements);
      const benchmarks = await this.getBenchmarkComparison(target, recentMeasurements);
      const recommendations = await this.generateRecommendations(target, metrics, benchmarks);

      return {
        target,
        metrics,
        measurements: recentMeasurements,
        trends,
        benchmarks,
        recommendations
      };

    } catch (error) {
      console.error(`Failed to get target performance report:`, error);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    dateFrom: Date,
    dateTo: Date,
    serviceType?: string
  ): Promise<{
    period: { from: Date; to: Date };
    summary: {
      totalTargets: number;
      compliantTargets: number;
      complianceRate: number;
      avgComplianceScore: number;
    };
    targetCompliance: Array<{
      targetId: number;
      targetName: string;
      serviceType: string;
      rtoCompliance: number;
      rpoCompliance: number;
      overallCompliance: number;
      measurementCount: number;
      slaBreaches: number;
    }>;
    trends: any;
    recommendations: string[];
  }> {
    console.log(`📋 Generating compliance report from ${dateFrom.toISOString()} to ${dateTo.toISOString()}`);

    try {
      const { storage } = await import('../storage');
      
      // Get targets and measurements for the period
      const targets = await storage.getRtoRpoTargets({ 
        active: true,
        serviceType
      });

      const measurements = await storage.getRtoRpoMeasurements({
        dateFrom,
        dateTo
      });

      // Calculate compliance for each target
      const targetCompliance = targets.map(target => {
        const targetMeasurements = measurements.filter(m => m.targetId === target.id);
        const rtoCompliant = targetMeasurements.filter(m => m.rtoAchieved);
        const rpoCompliant = targetMeasurements.filter(m => m.rpoAchieved);
        
        return {
          targetId: target.id,
          targetName: target.name,
          serviceType: target.serviceType,
          rtoCompliance: targetMeasurements.length > 0 ? (rtoCompliant.length / targetMeasurements.length) * 100 : 0,
          rpoCompliance: targetMeasurements.length > 0 ? (rpoCompliant.length / targetMeasurements.length) * 100 : 0,
          overallCompliance: targetMeasurements.length > 0 ? 
            ((rtoCompliant.filter(m => rpoCompliant.includes(m)).length) / targetMeasurements.length) * 100 : 0,
          measurementCount: targetMeasurements.length,
          slaBreaches: targetMeasurements.filter(m => !m.rtoAchieved || !m.rpoAchieved).length
        };
      });

      // Calculate summary
      const summary = {
        totalTargets: targets.length,
        compliantTargets: targetCompliance.filter(t => t.overallCompliance >= 95).length,
        complianceRate: targetCompliance.length > 0 ? 
          (targetCompliance.filter(t => t.overallCompliance >= 95).length / targetCompliance.length) * 100 : 0,
        avgComplianceScore: targetCompliance.length > 0 ?
          targetCompliance.reduce((sum, t) => sum + t.overallCompliance, 0) / targetCompliance.length : 0
      };

      // Generate trends and recommendations
      const trends = await this.generateComplianceTrends(targets, measurements);
      const recommendations = await this.generateComplianceRecommendations(targetCompliance, summary);

      return {
        period: { from: dateFrom, to: dateTo },
        summary,
        targetCompliance,
        trends,
        recommendations
      };

    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  /**
   * Process drill execution for RTO/RPO measurement
   */
  async processDrillMeasurement(drillExecution: DrillExecution): Promise<void> {
    if (!drillExecution.actualRtoSeconds || !drillExecution.actualRpoSeconds) {
      return;
    }

    try {
      const { storage } = await import('../storage');
      
      // Find related RTO/RPO targets based on drill configuration
      const drillConfig = await storage.getFailoverDrillConfiguration(drillExecution.configurationId);
      if (!drillConfig) {
        return;
      }

      const targets = await storage.getRtoRpoTargets({
        active: true,
        serviceType: drillConfig.drillType
      });

      // Record measurements for all applicable targets
      for (const target of targets) {
        await this.recordMeasurement(
          target.id,
          'drill',
          drillExecution.actualRtoSeconds,
          drillExecution.actualRpoSeconds,
          {
            drillExecutionId: drillExecution.id,
            triggeredBy: drillExecution.triggeredBy || 'system',
            metadata: {
              drillType: drillConfig.drillType,
              scenario: drillConfig.scenario,
              successScore: drillExecution.successScore
            }
          }
        );
      }

    } catch (error) {
      console.error('Failed to process drill measurement:', error);
    }
  }

  /**
   * Process backup operation for RTO/RPO measurement
   */
  async processBackupMeasurement(backupOperation: BackupOperation): Promise<void> {
    if (backupOperation.status !== 'completed') {
      return;
    }

    try {
      const { storage } = await import('../storage');
      
      // Calculate RPO based on backup frequency and data loss window
      const rpoSeconds = this.calculateBackupRpo(backupOperation);
      
      // Use backup duration as a component of RTO
      const rtoSeconds = this.calculateBackupContributionToRto(backupOperation);

      // Find related RTO/RPO targets
      const targets = await storage.getRtoRpoTargets({
        active: true,
        serviceType: 'database' // Backups primarily affect database recovery
      });

      // Record measurements for applicable targets
      for (const target of targets) {
        await this.recordMeasurement(
          target.id,
          'automated_test',
          rtoSeconds,
          rpoSeconds,
          {
            backupOperationId: backupOperation.id,
            triggeredBy: 'backup_system',
            metadata: {
              backupType: backupOperation.operationType,
              backupSize: backupOperation.sizeBytes,
              backupDuration: backupOperation.completedAt && backupOperation.startedAt ?
                new Date(backupOperation.completedAt).getTime() - new Date(backupOperation.startedAt).getTime() : null
            }
          }
        );
      }

    } catch (error) {
      console.error('Failed to process backup measurement:', error);
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Initialize performance metrics
   */
  private async initializePerformanceMetrics(): Promise<void> {
    try {
      const { storage } = await import('../storage');
      const targets = await storage.getActiveRtoRpoTargets();
      
      for (const target of targets) {
        await this.updatePerformanceMetrics(target.id);
      }

      console.log(`📊 Initialized performance metrics for ${targets.length} targets`);

    } catch (error) {
      console.error('Failed to initialize performance metrics:', error);
    }
  }

  /**
   * Start monitoring loops
   */
  private async startMonitoringLoops(): Promise<void> {
    // Performance monitoring - runs every 15 minutes
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkPerformanceAlerts();
        await this.updateAllPerformanceMetrics();
      } catch (error) {
        console.error('Error in performance monitoring loop:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes

    // Metrics update - runs every 5 minutes
    this.metricsUpdateInterval = setInterval(async () => {
      try {
        await this.refreshCachedMetrics();
      } catch (error) {
        console.error('Error in metrics update loop:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    console.log('🔄 Started performance monitoring loops');
  }

  /**
   * Update performance metrics for a target
   */
  private async updatePerformanceMetrics(targetId: number): Promise<void> {
    try {
      const { storage } = await import('../storage');
      
      const target = await storage.getRtoRpoTarget(targetId);
      if (!target) {
        return;
      }

      const measurements = await storage.getRtoRpoMeasurementsByTarget(targetId);
      const metrics = await this.calculateTargetMetrics(target, measurements);
      
      this.performanceCache.set(targetId, metrics);

    } catch (error) {
      console.error(`Failed to update performance metrics for target ${targetId}:`, error);
    }
  }

  /**
   * Calculate target performance metrics
   */
  private async calculateTargetMetrics(
    target: RtoRpoTarget,
    measurements: RtoRpoMeasurement[]
  ): Promise<RtoRpoPerformanceMetrics> {
    const recent30d = measurements.filter(m => 
      new Date(m.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const recentMeasurement = measurements.length > 0 ? measurements[0] : null;
    const successfulMeasurements = measurements.filter(m => m.rtoAchieved && m.rpoAchieved);

    // Calculate averages
    const avgRto30d = recent30d.length > 0 ? 
      recent30d.reduce((sum, m) => sum + (m.actualRtoSeconds || 0), 0) / recent30d.length : 0;
    const avgRpo30d = recent30d.length > 0 ? 
      recent30d.reduce((sum, m) => sum + (m.actualRpoSeconds || 0), 0) / recent30d.length : 0;

    // Calculate trends
    const rtoTrend = this.calculateTrend(recent30d.map(m => m.actualRtoSeconds || 0));
    const rpoTrend = this.calculateTrend(recent30d.map(m => m.actualRpoSeconds || 0));

    // Calculate compliance
    const rtoCompliant = recentMeasurement ? recentMeasurement.rtoAchieved : false;
    const rpoCompliant = recentMeasurement ? recentMeasurement.rpoAchieved : false;
    const overallCompliant = rtoCompliant && rpoCompliant;

    // Calculate compliance score
    const complianceScore = measurements.length > 0 ? 
      (successfulMeasurements.length / measurements.length) * 100 : 0;

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(target, recentMeasurement, complianceScore);

    return {
      targetId: target.id,
      targetName: target.name,
      serviceType: target.serviceType,
      component: target.component,
      businessCriticality: target.businessCriticality,
      currentRto: recentMeasurement?.actualRtoSeconds || null,
      currentRpo: recentMeasurement?.actualRpoSeconds || null,
      rtoTargetSeconds: target.rtoTargetSeconds,
      rpoTargetSeconds: target.rpoTargetSeconds,
      rtoCompliant,
      rpoCompliant,
      overallCompliant,
      complianceScore,
      avgRto30d,
      avgRpo30d,
      rtoTrend,
      rpoTrend,
      totalMeasurements: measurements.length,
      successfulMeasurements: successfulMeasurements.length,
      measurementSuccessRate: measurements.length > 0 ? (successfulMeasurements.length / measurements.length) * 100 : 0,
      riskLevel,
      lastMeasurement: recentMeasurement?.createdAt,
      lastIncident: undefined // This would come from incident tracking
    };
  }

  /**
   * Calculate overview metrics
   */
  private async calculateOverviewMetrics(
    targets: RtoRpoTarget[],
    measurements: RtoRpoMeasurement[]
  ): Promise<any> {
    const compliantTargets = targets.filter(target => {
      const targetMeasurements = measurements.filter(m => m.targetId === target.id);
      const recentMeasurement = targetMeasurements.length > 0 ? targetMeasurements[0] : null;
      return recentMeasurement ? (recentMeasurement.rtoAchieved && recentMeasurement.rpoAchieved) : false;
    });

    const avgRto = measurements.length > 0 ? 
      measurements.reduce((sum, m) => sum + (m.actualRtoSeconds || 0), 0) / measurements.length : 0;
    const avgRpo = measurements.length > 0 ? 
      measurements.reduce((sum, m) => sum + (m.actualRpoSeconds || 0), 0) / measurements.length : 0;

    const complianceRate = targets.length > 0 ? (compliantTargets.length / targets.length) * 100 : 0;
    const healthScore = this.calculateOverallHealthScore(targets, measurements);

    return {
      totalTargets: targets.length,
      compliantTargets: compliantTargets.length,
      complianceRate,
      avgRto,
      avgRpo,
      overallHealthScore: healthScore
    };
  }

  /**
   * Generate service performance summaries
   */
  private async generateServicePerformanceSummaries(
    targets: RtoRpoTarget[],
    measurements: RtoRpoMeasurement[]
  ): Promise<ServicePerformanceSummary[]> {
    const serviceTypes = [...new Set(targets.map(t => t.serviceType))];
    
    return serviceTypes.map(serviceType => {
      const serviceTargets = targets.filter(t => t.serviceType === serviceType);
      const serviceMeasurements = measurements.filter(m => 
        serviceTargets.some(t => t.id === m.targetId)
      );

      const components = [...new Set(serviceTargets.map(t => t.component).filter(Boolean))];
      const compliantTargets = serviceTargets.filter(target => {
        const targetMeasurements = serviceMeasurements.filter(m => m.targetId === target.id);
        const recentMeasurement = targetMeasurements.length > 0 ? targetMeasurements[0] : null;
        return recentMeasurement ? (recentMeasurement.rtoAchieved && recentMeasurement.rpoAchieved) : false;
      });

      const avgRto = serviceMeasurements.length > 0 ? 
        serviceMeasurements.reduce((sum, m) => sum + (m.actualRtoSeconds || 0), 0) / serviceMeasurements.length : 0;
      const avgRpo = serviceMeasurements.length > 0 ? 
        serviceMeasurements.reduce((sum, m) => sum + (m.actualRpoSeconds || 0), 0) / serviceMeasurements.length : 0;

      return {
        serviceType,
        componentsCount: components.length,
        targetsCount: serviceTargets.length,
        overallRtoCompliance: serviceTargets.length > 0 ? (compliantTargets.length / serviceTargets.length) * 100 : 0,
        overallRpoCompliance: serviceTargets.length > 0 ? (compliantTargets.length / serviceTargets.length) * 100 : 0,
        averageRto: avgRto,
        averageRpo: avgRpo,
        performingWell: compliantTargets.length,
        needsAttention: serviceTargets.length - compliantTargets.length,
        criticalIssues: 0, // Would be calculated based on risk levels
        performanceTrend: 'stable', // Would be calculated from historical data
        complianceHistory: [] // Would be populated with historical compliance data
      };
    });
  }

  /**
   * Generate benchmark comparisons
   */
  private async generateBenchmarkComparisons(
    targets: RtoRpoTarget[],
    measurements: RtoRpoMeasurement[]
  ): Promise<BenchmarkComparison[]> {
    try {
      const { storage } = await import('../storage');
      const benchmarks = await storage.getPerformanceBenchmarks({ active: true });

      return targets.map(target => {
        const targetMeasurements = measurements.filter(m => m.targetId === target.id);
        const recentMeasurement = targetMeasurements.length > 0 ? targetMeasurements[0] : null;
        
        // Find applicable benchmarks
        const applicableBenchmarks = benchmarks.filter(b => 
          b.serviceCategory === target.serviceType
        );

        const benchmark = applicableBenchmarks.length > 0 ? applicableBenchmarks[0] : null;

        if (!benchmark || !recentMeasurement) {
          return null;
        }

        const currentRto = recentMeasurement.actualRtoSeconds || 0;
        const currentRpo = recentMeasurement.actualRpoSeconds || 0;
        const industryMedianRto = benchmark.rtoSecondsMedian || 0;
        const industryMedianRpo = benchmark.rpoSecondsMedian || 0;

        return {
          targetId: target.id,
          targetName: target.name,
          serviceType: target.serviceType,
          industry: benchmark.industry || 'general',
          currentRto,
          currentRpo,
          industryMedianRto,
          industryMedianRpo,
          rtoPerformance: this.calculatePerformanceRating(currentRto, industryMedianRto),
          rpoPerformance: this.calculatePerformanceRating(currentRpo, industryMedianRpo),
          overallRating: 'average' as const,
          rtoImprovementOpportunity: Math.max(0, currentRto - industryMedianRto),
          rpoImprovementOpportunity: Math.max(0, currentRpo - industryMedianRpo),
          recommendedActions: this.generateImprovementRecommendations(currentRto, currentRpo, industryMedianRto, industryMedianRpo)
        };
      }).filter(Boolean) as BenchmarkComparison[];

    } catch (error) {
      console.error('Failed to generate benchmark comparisons:', error);
      return [];
    }
  }

  /**
   * Generate performance trends
   */
  private async generateTrends(
    targets: RtoRpoTarget[],
    measurements: RtoRpoMeasurement[],
    days: number
  ): Promise<any> {
    const dailyGroups = this.groupMeasurementsByDay(measurements, days);
    
    const rtoTrend = dailyGroups.map(group => ({
      date: group.date,
      value: group.measurements.length > 0 ? 
        group.measurements.reduce((sum, m) => sum + (m.actualRtoSeconds || 0), 0) / group.measurements.length : 0
    }));

    const rpoTrend = dailyGroups.map(group => ({
      date: group.date,
      value: group.measurements.length > 0 ? 
        group.measurements.reduce((sum, m) => sum + (m.actualRpoSeconds || 0), 0) / group.measurements.length : 0
    }));

    const complianceTrend = dailyGroups.map(group => {
      const compliantMeasurements = group.measurements.filter(m => m.rtoAchieved && m.rpoAchieved);
      return {
        date: group.date,
        rtoCompliance: group.measurements.length > 0 ? 
          (group.measurements.filter(m => m.rtoAchieved).length / group.measurements.length) * 100 : 0,
        rpoCompliance: group.measurements.length > 0 ? 
          (group.measurements.filter(m => m.rpoAchieved).length / group.measurements.length) * 100 : 0
      };
    });

    return {
      rtoTrend,
      rpoTrend,
      complianceTrend
    };
  }

  /**
   * Helper methods
   */
  private calculateDataIntegrityScore(context: any): number {
    // Calculate data integrity score based on measurement context
    return 100; // Simplified implementation
  }

  private calculatePerformanceScore(rtoAchieved: boolean, rpoAchieved: boolean, rtoVariance: number, rpoVariance: number): number {
    let score = 100;
    if (!rtoAchieved) score -= 30;
    if (!rpoAchieved) score -= 30;
    if (rtoVariance > 0) score -= Math.min(20, (rtoVariance / 60) * 10); // Penalize based on RTO variance
    if (rpoVariance > 0) score -= Math.min(20, (rpoVariance / 60) * 10); // Penalize based on RPO variance
    return Math.max(0, score);
  }

  private calculateOverallScore(rtoAchieved: boolean, rpoAchieved: boolean, rtoVariance: number, rpoVariance: number): number {
    const performanceScore = this.calculatePerformanceScore(rtoAchieved, rpoAchieved, rtoVariance, rpoVariance);
    const complianceBonus = (rtoAchieved && rpoAchieved) ? 10 : 0;
    return Math.min(100, performanceScore + complianceBonus);
  }

  private calculateTrend(values: number[]): 'improving' | 'stable' | 'degrading' {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
    
    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (changePercent < -5) return 'improving'; // Lower values are better for RTO/RPO
    if (changePercent > 5) return 'degrading';
    return 'stable';
  }

  private calculateRiskLevel(
    target: RtoRpoTarget,
    recentMeasurement: RtoRpoMeasurement | null,
    complianceScore: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (!recentMeasurement) return 'critical';
    if (!recentMeasurement.rtoAchieved || !recentMeasurement.rpoAchieved) return 'high';
    if (complianceScore < 80) return 'medium';
    return 'low';
  }

  private calculateOverallHealthScore(targets: RtoRpoTarget[], measurements: RtoRpoMeasurement[]): number {
    if (targets.length === 0) return 0;
    
    const targetScores = targets.map(target => {
      const targetMeasurements = measurements.filter(m => m.targetId === target.id);
      const successfulMeasurements = targetMeasurements.filter(m => m.rtoAchieved && m.rpoAchieved);
      return targetMeasurements.length > 0 ? (successfulMeasurements.length / targetMeasurements.length) * 100 : 0;
    });

    return targetScores.reduce((sum, score) => sum + score, 0) / targetScores.length;
  }

  private calculatePerformanceRating(currentValue: number, benchmarkValue: number): 'excellent' | 'good' | 'average' | 'poor' {
    if (currentValue <= benchmarkValue * 0.5) return 'excellent';
    if (currentValue <= benchmarkValue * 0.8) return 'good';
    if (currentValue <= benchmarkValue * 1.2) return 'average';
    return 'poor';
  }

  private generateImprovementRecommendations(currentRto: number, currentRpo: number, benchmarkRto: number, benchmarkRpo: number): string[] {
    const recommendations: string[] = [];
    
    if (currentRto > benchmarkRto * 1.5) {
      recommendations.push('Consider optimizing disaster recovery procedures to reduce RTO');
    }
    
    if (currentRpo > benchmarkRpo * 1.5) {
      recommendations.push('Increase backup frequency to reduce RPO');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable range');
    }
    
    return recommendations;
  }

  private groupMeasurementsByDay(measurements: RtoRpoMeasurement[], days: number): Array<{ date: Date; measurements: RtoRpoMeasurement[] }> {
    const groups: Array<{ date: Date; measurements: RtoRpoMeasurement[] }> = [];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayMeasurements = measurements.filter(m => {
        const measurementDate = new Date(m.createdAt);
        return measurementDate.toDateString() === date.toDateString();
      });
      
      groups.push({ date, measurements: dayMeasurements });
    }
    
    return groups;
  }

  private calculateBackupRpo(backupOperation: BackupOperation): number {
    // Calculate RPO based on backup frequency and data loss window
    // This is a simplified implementation
    const backupTypes: Record<string, number> = {
      'neon_snapshot': 300, // 5 minutes
      's3_export': 3600, // 1 hour
      'schema_backup': 1800, // 30 minutes
      'full_backup': 7200 // 2 hours
    };
    
    return backupTypes[backupOperation.operationType] || 3600;
  }

  private calculateBackupContributionToRto(backupOperation: BackupOperation): number {
    // Use backup duration as a component of RTO calculation
    if (!backupOperation.startedAt || !backupOperation.completedAt) {
      return 0;
    }
    
    const duration = new Date(backupOperation.completedAt).getTime() - new Date(backupOperation.startedAt).getTime();
    return Math.round(duration / 1000); // Convert to seconds
  }

  private async checkSlaCompliance(target: RtoRpoTarget, measurement: RtoRpoMeasurement): Promise<void> {
    if (!measurement.rtoAchieved || !measurement.rpoAchieved) {
      const alert: PerformanceAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'sla_breach',
        severity: target.businessCriticality === 'critical' ? 'critical' : 'high',
        targetId: target.id,
        message: `SLA breach detected for ${target.name}: RTO ${measurement.rtoAchieved ? 'achieved' : 'missed'}, RPO ${measurement.rpoAchieved ? 'achieved' : 'missed'}`,
        details: {
          actualRto: measurement.actualRtoSeconds,
          targetRto: target.rtoTargetSeconds,
          actualRpo: measurement.actualRpoSeconds,
          targetRpo: target.rpoTargetSeconds,
          measurement: measurement.measurementId
        },
        createdAt: new Date(),
        acknowledged: false
      };

      this.alertsCache.push(alert);
      console.log(`🚨 SLA breach alert generated for target ${target.name}`);
    }
  }

  private async checkPerformanceAlerts(): Promise<void> {
    // Check for performance degradation and other alerts
    console.log('🔍 Checking performance alerts');
  }

  private async updateAllPerformanceMetrics(): Promise<void> {
    try {
      const { storage } = await import('../storage');
      const targets = await storage.getActiveRtoRpoTargets();
      
      for (const target of targets) {
        await this.updatePerformanceMetrics(target.id);
      }
    } catch (error) {
      console.error('Failed to update all performance metrics:', error);
    }
  }

  private async refreshCachedMetrics(): Promise<void> {
    // Refresh cached performance metrics
    console.log('🔄 Refreshing cached performance metrics');
  }

  private async getTargetMetrics(targets: RtoRpoTarget[], filters?: any): Promise<RtoRpoPerformanceMetrics[]> {
    const metrics: RtoRpoPerformanceMetrics[] = [];
    
    for (const target of targets) {
      const cachedMetrics = this.performanceCache.get(target.id);
      if (cachedMetrics) {
        metrics.push(cachedMetrics);
      } else {
        const { storage } = await import('../storage');
        const measurements = await storage.getRtoRpoMeasurementsByTarget(target.id);
        const targetMetrics = await this.calculateTargetMetrics(target, measurements);
        this.performanceCache.set(target.id, targetMetrics);
        metrics.push(targetMetrics);
      }
    }

    return metrics;
  }

  private async calculateTargetTrends(target: RtoRpoTarget, measurements: RtoRpoMeasurement[]): Promise<any> {
    // Calculate detailed trends for a specific target
    return {
      rtoTrend: this.calculateTrend(measurements.map(m => m.actualRtoSeconds || 0)),
      rpoTrend: this.calculateTrend(measurements.map(m => m.actualRpoSeconds || 0))
    };
  }

  private async getBenchmarkComparison(target: RtoRpoTarget, measurements: RtoRpoMeasurement[]): Promise<BenchmarkComparison | null> {
    try {
      const { storage } = await import('../storage');
      const benchmarks = await storage.getPerformanceBenchmarks({ active: true });
      
      const recentMeasurement = measurements.length > 0 ? measurements[0] : null;
      const applicableBenchmark = benchmarks.find(b => b.serviceCategory === target.serviceType);
      
      if (!applicableBenchmark || !recentMeasurement) {
        return null;
      }

      const currentRto = recentMeasurement.actualRtoSeconds || 0;
      const currentRpo = recentMeasurement.actualRpoSeconds || 0;
      const industryMedianRto = applicableBenchmark.rtoSecondsMedian || 0;
      const industryMedianRpo = applicableBenchmark.rpoSecondsMedian || 0;

      return {
        targetId: target.id,
        targetName: target.name,
        serviceType: target.serviceType,
        industry: applicableBenchmark.industry || 'general',
        currentRto,
        currentRpo,
        industryMedianRto,
        industryMedianRpo,
        rtoPerformance: this.calculatePerformanceRating(currentRto, industryMedianRto),
        rpoPerformance: this.calculatePerformanceRating(currentRpo, industryMedianRpo),
        overallRating: 'average',
        rtoImprovementOpportunity: Math.max(0, currentRto - industryMedianRto),
        rpoImprovementOpportunity: Math.max(0, currentRpo - industryMedianRpo),
        recommendedActions: this.generateImprovementRecommendations(currentRto, currentRpo, industryMedianRto, industryMedianRpo)
      };

    } catch (error) {
      console.error('Failed to get benchmark comparison:', error);
      return null;
    }
  }

  private async generateRecommendations(target: RtoRpoTarget, metrics: RtoRpoPerformanceMetrics, benchmarks: BenchmarkComparison | null): Promise<string[]> {
    const recommendations: string[] = [];
    
    if (!metrics.rtoCompliant) {
      recommendations.push('RTO target not being met - review disaster recovery procedures');
    }
    
    if (!metrics.rpoCompliant) {
      recommendations.push('RPO target not being met - consider more frequent backups');
    }
    
    if (metrics.complianceScore < 80) {
      recommendations.push('Overall compliance below 80% - investigate recurring issues');
    }
    
    if (benchmarks && benchmarks.rtoPerformance === 'poor') {
      recommendations.push('RTO performance below industry standards - benchmark against competitors');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance is meeting targets - continue current practices');
    }
    
    return recommendations;
  }

  private async generateComplianceTrends(targets: RtoRpoTarget[], measurements: RtoRpoMeasurement[]): Promise<any> {
    // Generate compliance trends over time
    return {
      complianceOverTime: [],
      performanceCorrelations: []
    };
  }

  private async generateComplianceRecommendations(targetCompliance: any[], summary: any): Promise<string[]> {
    const recommendations: string[] = [];
    
    if (summary.complianceRate < 95) {
      recommendations.push('Overall compliance below 95% - review and improve disaster recovery processes');
    }
    
    const poorPerformers = targetCompliance.filter(t => t.overallCompliance < 80);
    if (poorPerformers.length > 0) {
      recommendations.push(`${poorPerformers.length} targets need immediate attention for compliance improvement`);
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const rtoRpoPerformanceDashboardService = new RtoRpoPerformanceDashboardService();