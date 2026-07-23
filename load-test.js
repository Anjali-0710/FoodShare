/**
 * FoodReach AI — High Performance Baseline / Load Testing Harness
 * 
 * Target Parameters:
 * - Virtual Users (VUs): 100 concurrent workers
 * - Duration: 60 Seconds (1 Minute continuous run)
 * - Endpoints: 
 *     1. GET  /health (System Health)
 *     2. GET  /api/ai/freshness (AI Decay Calculation)
 *     3. POST /api/ai/recommend-ngos (Smart NGO Matching)
 *     4. GET  /api/ai/demand (AI Category Demand Prediction)
 */

const BACKEND_URL = 'http://localhost:5000/api';
const HEALTH_URL = 'http://localhost:5000/health';

const VIRTUAL_USERS = 100;
const DURATION_SECONDS = 60;

async function setupAuthToken() {
  const testEmail = `loadtester-${Date.now()}@foodshare.com`;

  // Register
  const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Load Test Worker',
      email: testEmail,
      password: 'password123',
      role: 'donor',
      contactNumber: '+919888000111',
      address: 'Connaught Place, New Delhi',
      latitude: 28.6304,
      longitude: 77.2177,
    }),
  });
  const regData = await regRes.json();
  if (!regData.success) throw new Error(regData.message || 'Registration failed');

  // Verify OTP
  const verifyRes = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      code: regData.code,
    }),
  });
  const verifyData = await verifyRes.json();
  if (!verifyData.success) throw new Error(verifyData.message || 'OTP verification failed');

  return verifyData.token;
}

async function runLoadTest() {
  console.log('===========================================================');
  console.log('🚀 FOODREACH AI — BASELINE & LOAD TEST INITIALIZING');
  console.log('===========================================================');

  const token = await setupAuthToken();
  console.log('✅ Bearer Auth Token acquired successfully!\n');

  const nowStr = new Date().toISOString();
  const expStr = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

  const ENDPOINTS = [
    { name: 'Health Check', url: HEALTH_URL, method: 'GET', auth: false },
    {
      name: 'AI Freshness Decay',
      url: `${BACKEND_URL}/ai/freshness?foodType=Cooked%20Food&preparationTime=${nowStr}&bestBeforeDate=${expStr}&temperature=29`,
      method: 'GET',
      auth: true,
    },
    {
      name: 'Smart NGO Matching',
      url: `${BACKEND_URL}/ai/recommend-ngos`,
      method: 'POST',
      auth: true,
      body: { latitude: 28.6304, longitude: 77.2177, foodType: 'Cooked Food', quantity: 40 },
    },
    {
      name: 'Demand Forecast',
      url: `${BACKEND_URL}/ai/demand`,
      method: 'GET',
      auth: true,
    },
  ];

  console.log(`• Virtual Users (Concurrent Workers): ${VIRTUAL_USERS}`);
  console.log(`• Test Duration:                      ${DURATION_SECONDS} seconds (1 minute)`);
  console.log(`• Target Server:                       http://localhost:5000`);
  console.log(`• Target Endpoints:                   ${ENDPOINTS.length} endpoints`);
  console.log('===========================================================\n');

  const startTime = Date.now();
  const endTime = startTime + DURATION_SECONDS * 1000;

  const latencyStats = [];
  let totalSuccessfulRequests = 0;
  let totalFailedRequests = 0;
  const statusCodeCounts = {};

  const perEndpointStats = {};
  ENDPOINTS.forEach((ep) => {
    perEndpointStats[ep.name] = { count: 0, latencies: [], errors: 0 };
  });

  // Worker loop function for each Virtual User
  async function worker(vuId) {
    let epIndex = vuId % ENDPOINTS.length;

    while (Date.now() < endTime) {
      const ep = ENDPOINTS[epIndex];
      epIndex = (epIndex + 1) % ENDPOINTS.length;

      const reqStart = performance.now();
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (ep.auth) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const options = {
          method: ep.method,
          headers,
        };
        if (ep.body) {
          options.body = JSON.stringify(ep.body);
        }

        const res = await fetch(ep.url, options);
        const reqEnd = performance.now();
        const latency = reqEnd - reqStart;

        latencyStats.push(latency);
        statusCodeCounts[res.status] = (statusCodeCounts[res.status] || 0) + 1;
        perEndpointStats[ep.name].latencies.push(latency);
        perEndpointStats[ep.name].count++;

        if (res.ok) {
          totalSuccessfulRequests++;
        } else {
          totalFailedRequests++;
          perEndpointStats[ep.name].errors++;
        }
      } catch (err) {
        const reqEnd = performance.now();
        const latency = reqEnd - reqStart;
        latencyStats.push(latency);
        totalFailedRequests++;
        statusCodeCounts['ERROR'] = (statusCodeCounts['ERROR'] || 0) + 1;
        perEndpointStats[ep.name].errors++;
      }

      // Micro-pause to maintain controlled pacing (20ms)
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  console.log(`⏱️ Starting 1-minute load test with ${VIRTUAL_USERS} VUs...`);

  // Launch 100 concurrent worker promises
  const workers = [];
  for (let i = 0; i < VIRTUAL_USERS; i++) {
    workers.push(worker(i));
  }

  // Periodic progress updates every 10 seconds
  const interval = setInterval(() => {
    const elapsedSecs = Math.round((Date.now() - startTime) / 1000);
    const reqsCount = latencyStats.length;
    const currentRps = (reqsCount / (elapsedSecs || 1)).toFixed(1);
    console.log(`   [Progress] ${elapsedSecs}s / 60s elapsed — ${reqsCount} reqs completed (${currentRps} RPS)`);
  }, 10000);

  await Promise.all(workers);
  clearInterval(interval);

  const totalTimeMs = Date.now() - startTime;
  const totalTimeSecs = totalTimeMs / 1000;
  const totalRequests = latencyStats.length;
  const reqsPerSec = (totalRequests / totalTimeSecs).toFixed(2);

  latencyStats.sort((a, b) => a - b);

  const minLatency = latencyStats.length > 0 ? latencyStats[0].toFixed(2) : 0;
  const maxLatency = latencyStats.length > 0 ? latencyStats[latencyStats.length - 1].toFixed(2) : 0;
  const sumLatency = latencyStats.reduce((a, b) => a + b, 0);
  const avgLatency = latencyStats.length > 0 ? (sumLatency / latencyStats.length).toFixed(2) : 0;

  const p50 = latencyStats.length > 0 ? latencyStats[Math.floor(latencyStats.length * 0.50)].toFixed(2) : 0;
  const p95 = latencyStats.length > 0 ? latencyStats[Math.floor(latencyStats.length * 0.95)].toFixed(2) : 0;
  const p99 = latencyStats.length > 0 ? latencyStats[Math.floor(latencyStats.length * 0.99)].toFixed(2) : 0;
  const successRate = totalRequests > 0 ? ((totalSuccessfulRequests / totalRequests) * 100).toFixed(2) : '0.00';

  console.log('\n===========================================================');
  console.log('📊 LOAD TEST FINAL RESULTS SUMMARY');
  console.log('===========================================================');
  console.log(`Total Duration:       ${totalTimeSecs.toFixed(2)} seconds`);
  console.log(`Virtual Users (VUs):  ${VIRTUAL_USERS}`);
  console.log(`Total Requests Sent:  ${totalRequests}`);
  console.log(`Requests / Sec (RPS): ${reqsPerSec} req/sec`);
  console.log(`Success Rate:         ${successRate}% (${totalSuccessfulRequests} successful, ${totalFailedRequests} failed)`);
  console.log('-----------------------------------------------------------');
  console.log('⏱️ RESPONSE TIME STATS (Latency):');
  console.log(`  • Average Response Time: ${avgLatency} ms`);
  console.log(`  • Fastest Response (Min): ${minLatency} ms`);
  console.log(`  • Slowest Response (Max): ${maxLatency} ms`);
  console.log(`  • 50th Percentile (P50):  ${p50} ms`);
  console.log(`  • 95th Percentile (P95):  ${p95} ms`);
  console.log(`  • 99th Percentile (P99):  ${p99} ms`);
  console.log('-----------------------------------------------------------');
  console.log('🏷️ STATUS CODE BREAKDOWN:');
  Object.entries(statusCodeCounts).forEach(([code, count]) => {
    console.log(`  • Status ${code}: ${count} requests (${((count / totalRequests) * 100).toFixed(1)}%)`);
  });
  console.log('-----------------------------------------------------------');
  console.log('📌 PER-ENDPOINT PERFORMANCE:');
  Object.entries(perEndpointStats).forEach(([name, data]) => {
    data.latencies.sort((a, b) => a - b);
    const epAvg = data.latencies.length > 0 ? (data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length).toFixed(2) : 0;
    const epP95 = data.latencies.length > 0 ? data.latencies[Math.floor(data.latencies.length * 0.95)].toFixed(2) : 0;
    console.log(`  • [${name}]: ${data.count} reqs | Avg: ${epAvg}ms | P95: ${epP95}ms | Errors: ${data.errors}`);
  });
  console.log('===========================================================\n');
}

runLoadTest().catch((err) => {
  console.error('Load test error:', err);
  process.exit(1);
});
