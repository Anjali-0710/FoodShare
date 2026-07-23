/**
 * FoodShare AI Platform - Integration Test Validation Harness
 * Runs on standard Node.js (Node 18+ native fetch support).
 * Verifies backend REST and AI APIs with full request/response diagnostic output.
 */

const HOST = process.env.TEST_HOST || '127.0.0.1';
const PORT = process.env.TEST_PORT || '5000';
const BASE_URL = `http://${HOST}:${PORT}`;
const BACKEND_URL = `${BASE_URL}/api`;

async function safeFetch(url, options = {}) {
  const method = options.method || 'GET';
  const headers = options.headers || {};
  const body = options.body || null;

  console.log('\n-----------------------------------------------------------');
  console.log(`📤 OUTGOING REQUEST:`);
  console.log(`   • URL:     ${url}`);
  console.log(`   • Method:  ${method}`);
  console.log(`   • Headers: ${JSON.stringify(headers)}`);
  if (body) {
    console.log(`   • Body:    ${body}`);
  }
  console.log('-----------------------------------------------------------');

  try {
    const res = await fetch(url, options);

    // Extract headers object
    const resHeaders = {};
    res.headers.forEach((val, key) => {
      resHeaders[key] = val;
    });

    const contentType = res.headers.get('content-type') || '';
    let bodyText = '';
    let bodyData = null;
    try {
      bodyText = await res.text();
      if (contentType.includes('application/json') || bodyText.startsWith('{') || bodyText.startsWith('[')) {
        bodyData = JSON.parse(bodyText);
      }
    } catch (e) {
      // Body not JSON
    }

    console.log(`📥 INCOMING RESPONSE:`);
    console.log(`   • URL:         ${url}`);
    console.log(`   • Status Code: ${res.status} ${res.statusText}`);
    console.log(`   • Headers:     ${JSON.stringify(resHeaders)}`);
    console.log(`   • Body:        ${bodyText || '(empty)'}`);
    console.log('-----------------------------------------------------------\n');

    if (!res.ok) {
      console.error(`❌ HTTP Error Response (${res.status} ${res.statusText}) for URL: ${url}`);
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}: ${bodyText}`);
    }

    return { status: res.status, data: bodyData || bodyText, headers: resHeaders };
  } catch (err) {
    console.error('\n===========================================================');
    console.error(`❌ FETCH EXCEPTION ENCOUNTERED:`);
    console.error(`   • Requested URL: ${url}`);
    console.error(`   • Method:        ${method}`);
    console.error(`   • Error Message: ${err.message}`);
    if (err.cause) {
      console.error(`   • Error Cause:  `, err.cause);
    }
    if (err.stack) {
      console.error(`   • Full Stack:   \n${err.stack}`);
    }
    console.error('===========================================================\n');
    throw err;
  }
}

async function waitForServerReadiness(maxRetries = 15, delayMs = 2000) {
  const healthUrl = `${BASE_URL}/health`;
  console.log(`\nStep 1: Waiting for server readiness at ${healthUrl}...`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  [Attempt ${attempt}/${maxRetries}] Checking health at ${healthUrl}...`);
      const res = await safeFetch(healthUrl);
      if (res.status === 200) {
        const data = res.data;
        console.log(`✅ Server Status: ${data.status} | Time: ${data.timestamp} | Environment: ${data.environment}`);
        return true;
      }
      console.warn(`  ⚠️ Health check returned HTTP ${res.status}, retrying in ${delayMs}ms...`);
    } catch (err) {
      console.warn(`  ⚠️ Health check attempt ${attempt} failed (${err.message}), retrying in ${delayMs}ms...`);
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`Server at ${healthUrl} failed to respond with HTTP 200 after ${maxRetries} attempts.`);
}

async function runTests() {
  console.log('===========================================================');
  console.log('🧪 FOODREACH AI — FULL DIAGNOSTIC API VERIFICATION SUITE');
  console.log('===========================================================');
  console.log(`• Target Host: ${HOST}:${PORT}`);
  console.log(`• Base URL:    ${BASE_URL}`);
  console.log(`• API URL:     ${BACKEND_URL}`);
  console.log('===========================================================\n');

  try {
    // 1. Health check with retry
    await waitForServerReadiness();

    // 2. Register a new Donor
    console.log('\nStep 2: Registering a test Donor...');
    const testEmail = `baker-${Date.now()}@foodshare.com`;
    const regRes = await safeFetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Delhi Organic Bakes',
        email: testEmail,
        password: 'password123',
        role: 'donor',
        contactNumber: '+919888777666',
        address: 'Connaught Place, New Delhi',
        latitude: 28.6304,
        longitude: 77.2177,
      }),
    });
    const regData = regRes.data;
    if (!regData.success) throw new Error(`Registration failed: ${regData.message}`);

    // Verify OTP to acquire token
    const verifyRes = await safeFetch(`${BACKEND_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: regData.code,
      }),
    });
    const verifyData = verifyRes.data;
    if (!verifyData.success) throw new Error(`OTP verification failed: ${verifyData.message}`);
    const token = verifyData.token;
    console.log('✅ Donor registered and OTP verified! Token acquired.');

    // 3. Login User
    console.log('\nStep 3: Logging in with registered user...');
    const loginRes = await safeFetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123',
      }),
    });
    const loginData = loginRes.data;
    if (!loginData.success) throw new Error(`Login failed: ${loginData.message}`);
    console.log('✅ Login authorized! User profile resolved:', loginData.user.name);

    // 4. Test AI Freshness calculation
    console.log('\nStep 4: Requesting AI Freshness decay forecast...');
    const nowStr = new Date().toISOString();
    const expiryStr = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const freshnessRes = await safeFetch(
      `${BACKEND_URL}/ai/freshness?foodType=Cooked%20Food&preparationTime=${nowStr}&bestBeforeDate=${expiryStr}&temperature=29`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const freshnessData = freshnessRes.data;
    if (!freshnessData.success) throw new Error(`Freshness calculation failed: ${freshnessData.message}`);
    console.log(`✅ AI Freshness Score: ${freshnessData.freshnessScore}% | Safety: ${freshnessData.status}`);

    // 5. Test NGO recommendation coordinates matchmaking
    console.log('\nStep 5: Testing Smart NGO Recommendation coords...');
    const ngoRes = await safeFetch(`${BACKEND_URL}/ai/recommend-ngos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        latitude: 28.6304,
        longitude: 77.2177,
        foodType: 'Cooked Food',
        quantity: 40,
      }),
    });
    const ngoData = ngoRes.data;
    if (!ngoData.success) throw new Error(`NGO Recommendation failed: ${ngoData.message}`);
    console.log('✅ Matching NGOs computed successfully:');
    if (Array.isArray(ngoData.recommendations)) {
      ngoData.recommendations.forEach((rec, idx) => {
        console.log(`  [NGO #${idx + 1}] Name: ${rec.name} | Distance: ${rec.distanceKm} km | Score: ${rec.matchScore}%`);
      });
    }

    // 6. Create Surplus Donation
    console.log('\nStep 6: Publishing surplus food listing...');
    const donateRes = await safeFetch(`${BACKEND_URL}/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        foodType: 'Cooked Food',
        quantity: 25,
        unit: 'Plates',
        bestBeforeDate: expiryStr,
        preparationTime: nowStr,
        temperature: 24,
        pickupAddress: 'Connaught Place block C, gate 2, New Delhi',
        latitude: 28.6304,
        longitude: 77.2177,
        contactNumber: '+919888777666',
        additionalNotes: 'Freshly cooked rice from afternoon event.',
      }),
    });
    const donateData = donateRes.data;
    if (!donateData.success) throw new Error(`Donation creation failed: ${donateData.message}`);
    console.log(`✅ Donation listed successfully! ID: ${donateData.donation.id || donateData.donation._id} | QR Token: ${donateData.donation.qrCode}`);

    // 7. Get user's donations list
    console.log('\nStep 7: Reading user posted listings...');
    const listRes = await safeFetch(`${BACKEND_URL}/donations?mine=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listData = listRes.data;
    if (!listData.success) throw new Error(`List donations failed: ${listData.message}`);
    console.log(`✅ Active postings found: ${listData.donations.length}`);

    // 8. Demand forecasting
    console.log('\nStep 8: Fetching system-wide demand prediction forecasts...');
    const demandRes = await safeFetch(`${BACKEND_URL}/ai/demand`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const demandData = demandRes.data;
    if (!demandData.success) throw new Error(`Demand prediction failed: ${demandData.message}`);
    console.log('✅ AI demand prediction returned successfully:');
    if (Array.isArray(demandData.predictions)) {
      demandData.predictions.forEach((p) => {
        console.log(`  [Demand] Category: ${p.category} | Predicted: ${p.predictedDemandKg} Kg | Confidence: ${p.confidence}%`);
      });
    }

    // 9. Forgot and Reset Password Flow
    console.log('\nStep 9: Testing Forgot & Reset Password Flow...');
    const forgotEmail = `forgot-${Date.now()}@foodshare.com`;

    const tempRegRes = await safeFetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Temporary Reset Tester',
        email: forgotEmail,
        password: 'initialpassword123',
        role: 'volunteer',
        contactNumber: '+919999000011',
        address: 'Test Suite Lab, Delhi',
      }),
    });
    const tempRegData = tempRegRes.data;
    if (!tempRegData.success) throw new Error(`Temp registration failed: ${tempRegData.message}`);

    const tempVerifyRes = await safeFetch(`${BACKEND_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: forgotEmail,
        code: tempRegData.code,
      }),
    });
    const tempVerifyData = tempVerifyRes.data;
    if (!tempVerifyData.success) throw new Error(`Temp OTP verification failed: ${tempVerifyData.message}`);

    const forgotRes = await safeFetch(`${BACKEND_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail }),
    });
    const forgotData = forgotRes.data;
    if (!forgotData.success) throw new Error(`Forgot password call failed: ${forgotData.message}`);
    const code = forgotData.code;
    console.log(`✅ Forgot password code generated: ${code}`);

    const resetRes = await safeFetch(`${BACKEND_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: forgotEmail,
        code: code,
        newPassword: 'newsecurepassword456',
      }),
    });
    const resetData = resetRes.data;
    if (!resetData.success) throw new Error(`Password reset call failed: ${resetData.message}`);
    console.log('✅ Password updated successfully using validation code.');

    const verifyLoginRes = await safeFetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: forgotEmail,
        password: 'newsecurepassword456',
      }),
    });
    const verifyLoginData = verifyLoginRes.data;
    if (!verifyLoginData.success) throw new Error(`Login with new password failed: ${verifyLoginData.message}`);
    console.log('✅ Login authorized with updated credentials!');

    console.log('\n===========================================================');
    console.log('🎉 ALL INTEGRATION API TESTS COMPLETED SUCCESSFULLY! ✅');
    console.log('===========================================================\n');
  } catch (err) {
    console.error('\n===========================================================');
    console.error('❌ TEST HARNESS RUN ENCOUNTERED AN ERROR');
    console.error('===========================================================');
    console.error(`• Error Message: ${err.message}`);
    if (err.cause) console.error(`• Cause:        `, err.cause);
    if (err.stack) console.error(`• Stack Trace:  \n${err.stack}`);
    console.error('===========================================================\n');
    process.exit(1);
  }
}

runTests();
