import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const electionViewRate = new Rate('election_view_success');
const apiResponseTime = new Trend('api_response_time');
const cacheHitCounter = new Counter('cache_hits');

// Load testing configuration for Election Night 2026
export const options = {
  scenarios: {
    // Election night peak traffic - 100,000 concurrent users
    election_night_peak: {
      executor: 'ramping-vus',
      stages: [
        { duration: '5m', target: 1000 },   // Ramp up
        { duration: '10m', target: 25000 }, // Build to quarter capacity
        { duration: '15m', target: 50000 }, // Half capacity
        { duration: '20m', target: 75000 }, // Three-quarter capacity
        { duration: '30m', target: 100000 }, // Peak election night traffic
        { duration: '45m', target: 100000 }, // Sustained peak
        { duration: '15m', target: 50000 },  // Wind down
        { duration: '10m', target: 0 },      // Complete wind down
      ],
    },
    
    // Campaign dashboard continuous load
    campaign_dashboards: {
      executor: 'constant-vus',
      vus: 1000, // 1000 campaigns checking analytics
      duration: '2h',
      exec: 'campaignAnalytics',
    },
    
    // API stress test - 1 million requests/hour
    api_stress: {
      executor: 'constant-arrival-rate',
      rate: 278, // requests per second (1M/hour ÷ 3600)
      timeUnit: '1s',
      duration: '1h',
      preAllocatedVUs: 100,
      maxVUs: 1000,
      exec: 'apiStress',
    }
  },
  
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
    election_view_success: ['rate>0.99'], // 99% success rate
    api_response_time: ['p(90)<1000'], // 90% under 1s
  },
};

const BASE_URL = 'http://localhost:5000';

// Realistic election data for testing
const testStates = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI'];
const electionTypes = ['general', 'primary', 'special'];

// Main election night scenario
export default function() {
  const state = testStates[Math.floor(Math.random() * testStates.length)];
  const type = electionTypes[Math.floor(Math.random() * electionTypes.length)];
  
  // 1. Load main election list (most common request)
  let response = http.get(`${BASE_URL}/api/elections?state=${state}&type=${type}`);
  
  check(response, {
    'elections loaded successfully': (r) => r.status === 200,
    'response time acceptable': (r) => r.timings.duration < 2000,
  });
  
  electionViewRate.add(response.status === 200);
  apiResponseTime.add(response.timings.duration);
  
  if (response.headers['X-Cache-Hit']) {
    cacheHitCounter.add(1);
  }
  
  // 2. Get election statistics (common on election night)
  response = http.get(`${BASE_URL}/api/elections/stats`);
  check(response, {
    'stats loaded': (r) => r.status === 200,
  });
  
  // 3. Simulate user viewing specific election
  if (response.status === 200) {
    const elections = JSON.parse(response.body);
    if (elections.length > 0) {
      const randomElection = elections[Math.floor(Math.random() * elections.length)];
      
      // Get election details
      response = http.get(`${BASE_URL}/api/elections/${randomElection.id}`);
      check(response, {
        'election details loaded': (r) => r.status === 200,
      });
      
      // Get candidates
      response = http.get(`${BASE_URL}/api/elections/${randomElection.id}/candidates`);
      check(response, {
        'candidates loaded': (r) => r.status === 200,
      });
    }
  }
  
  // Random think time between 1-5 seconds
  sleep(Math.random() * 4 + 1);
}

// Campaign analytics scenario
export function campaignAnalytics() {
  const campaignApiKey = `camp_test_${Math.random().toString(36).substr(2, 9)}`;
  const electionId = Math.floor(Math.random() * 173) + 1;
  
  // Campaign checking their analytics
  let response = http.get(`${BASE_URL}/api/campaign/analytics/${electionId}`, {
    headers: {
      'X-API-Key': campaignApiKey,
    },
  });
  
  check(response, {
    'campaign analytics accessible': (r) => r.status === 200 || r.status === 401, // 401 expected for test keys
  });
  
  sleep(5); // Campaigns check less frequently
}

// API stress test scenario
export function apiStress() {
  const endpoints = [
    '/api/elections',
    '/api/elections/stats', 
    '/api/election-cycles',
    '/api/congress/bills',
    '/api/congress/members'
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const response = http.get(`${BASE_URL}${endpoint}`);
  
  check(response, {
    'api endpoint responsive': (r) => r.status === 200,
    'fast api response': (r) => r.timings.duration < 1000,
  });
}

export function setup() {
  console.log('Starting Election Night 2026 Load Test');
  console.log('Simulating 100,000 concurrent users');
  console.log('Target: 1 million API requests per hour');
  
  // Warm up the cache
  http.get(`${BASE_URL}/api/elections`);
  http.get(`${BASE_URL}/api/elections/stats`);
  
  return { timestamp: new Date().toISOString() };
}