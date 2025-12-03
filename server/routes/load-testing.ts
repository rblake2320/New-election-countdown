/**
 * Load Testing Management API Routes
 * Enterprise-grade performance testing for election traffic
 */
import { Router, Request, Response } from 'express';
import { loadTestingService } from '../services/load-testing-service';

const router = Router();

/**
 * GET /api/load-testing/profiles
 * Get available load test profiles
 */
router.get('/profiles', (req: Request, res: Response) => {
  try {
    const profiles = loadTestingService.getTestProfiles();
    
    res.json({
      status: 'success',
      data: {
        profiles,
        count: profiles.length,
        description: 'Available load test profiles for election traffic simulation'
      }
    });
  } catch (error) {
    console.error('Error fetching load test profiles:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch load test profiles'
    });
  }
});

/**
 * POST /api/load-testing/start
 * Start a load test
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { profile } = req.body;
    
    if (!profile) {
      return res.status(400).json({
        status: 'error',
        message: 'Load test profile name is required'
      });
    }
    
    const testId = await loadTestingService.startLoadTest(profile);
    
    res.json({
      status: 'success',
      data: {
        testId,
        message: `Load test '${profile}' started successfully`,
        estimatedDuration: '30-60 minutes',
        monitoringUrl: `/api/load-testing/results/${testId}`
      }
    });
  } catch (error) {
    console.error('Error starting load test:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to start load test'
    });
  }
});

/**
 * GET /api/load-testing/results/:testId
 * Get load test results
 */
router.get('/results/:testId', (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const result = loadTestingService.getLoadTestResult(testId);
    
    if (!result) {
      return res.status(404).json({
        status: 'error',
        message: 'Load test not found'
      });
    }
    
    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error fetching load test results:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch load test results'
    });
  }
});

/**
 * POST /api/load-testing/stop/:testId
 * Stop a running load test
 */
router.post('/stop/:testId', (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const stopped = loadTestingService.stopLoadTest(testId);
    
    if (!stopped) {
      return res.status(404).json({
        status: 'error',
        message: 'Load test not found or not running'
      });
    }
    
    res.json({
      status: 'success',
      data: {
        testId,
        message: 'Load test stopped successfully'
      }
    });
  } catch (error) {
    console.error('Error stopping load test:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to stop load test'
    });
  }
});

/**
 * GET /api/load-testing/active
 * Get all active load tests
 */
router.get('/active', (req: Request, res: Response) => {
  try {
    const activeTests = loadTestingService.getActiveTests();
    
    res.json({
      status: 'success',
      data: {
        activeTests,
        count: activeTests.length,
        totalRunningTime: activeTests.reduce((sum, test) => {
          const startTime = new Date(test.startTime).getTime();
          return sum + (Date.now() - startTime);
        }, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching active load tests:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch active load tests'
    });
  }
});

/**
 * GET /api/load-testing/history
 * Get load test history
 */
router.get('/history', (req: Request, res: Response) => {
  try {
    const history = loadTestingService.getTestHistory();
    
    res.json({
      status: 'success',
      data: {
        history,
        count: history.length,
        summary: {
          totalTests: history.length,
          successfulTests: history.filter(t => t.status === 'completed').length,
          failedTests: history.filter(t => t.status === 'failed').length,
          averageResponseTime: history.length > 0 
            ? Math.round(history.reduce((sum, t) => sum + t.metrics.averageResponseTime, 0) / history.length)
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching load test history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch load test history'
    });
  }
});

/**
 * GET /api/load-testing/election-readiness
 * Get election readiness assessment
 */
router.get('/election-readiness', (req: Request, res: Response) => {
  try {
    const readinessReport = loadTestingService.generateElectionReadinessReport();
    
    res.json({
      status: 'success',
      data: {
        ...readinessReport,
        timestamp: new Date().toISOString(),
        nextRecommendedTest: 'presidential-election',
        preparationChecklist: [
          'Complete presidential election load test',
          'Verify auto-scaling configuration',
          'Test disaster recovery procedures',
          'Validate monitoring and alerting',
          'Prepare incident response team',
          'Review capacity scaling triggers',
          'Test backup systems and failover',
          'Validate CDN and caching strategies'
        ]
      }
    });
  } catch (error) {
    console.error('Error generating election readiness report:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate election readiness report'
    });
  }
});

/**
 * GET /api/load-testing/dashboard
 * Get load testing dashboard data
 */
router.get('/dashboard', (req: Request, res: Response) => {
  try {
    const activeTests = loadTestingService.getActiveTests();
    const history = loadTestingService.getTestHistory();
    const readiness = loadTestingService.generateElectionReadinessReport();
    
    // Calculate trends
    const last7Days = history.filter(test => {
      const testDate = new Date(test.startTime);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return testDate > weekAgo;
    });

    const performanceTrend = last7Days.length > 0 
      ? last7Days.reduce((sum, test) => sum + test.metrics.averageResponseTime, 0) / last7Days.length
      : 0;

    const dashboard = {
      overview: {
        activeTests: activeTests.length,
        totalTestsCompleted: history.length,
        electionReadinessScore: readiness.score,
        electionReadinessLevel: readiness.overallReadiness,
        lastTestDate: history.length > 0 ? history[history.length - 1].startTime : null
      },
      performance: {
        averageResponseTime: Math.round(performanceTrend),
        peakConcurrentUsers: Math.max(...history.map(t => t.config.concurrentUsers), 0),
        successRate: history.length > 0 
          ? Math.round((history.filter(t => t.status === 'completed').length / history.length) * 100)
          : 0,
        weeklyTestCount: last7Days.length
      },
      capacity: {
        maxTestedLoad: readiness.capacityAnalysis.maxTestedUsers || 0,
        averageErrorRate: Math.round((readiness.capacityAnalysis.averageErrorRate || 0) * 100) / 100,
        recommendedInstances: history.length > 0 && history[history.length - 1].scalingPlan
          ? history[history.length - 1].scalingPlan!.recommendedCapacity.recommendedInstances
          : 'Unknown'
      },
      upcomingTests: [
        { name: 'Weekly Capacity Check', scheduled: 'Every Monday 2 AM' },
        { name: 'Pre-Election Stress Test', scheduled: '1 week before election' },
        { name: 'Election Night Simulation', scheduled: '48 hours before election' }
      ],
      alerts: activeTests.length > 0 
        ? ['Load test in progress - monitor for performance degradation']
        : readiness.score < 75 
          ? ['System readiness below threshold - schedule load test']
          : []
    };
    
    res.json({
      status: 'success',
      data: dashboard
    });
  } catch (error) {
    console.error('Error fetching load testing dashboard:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch load testing dashboard'
    });
  }
});

export default router;