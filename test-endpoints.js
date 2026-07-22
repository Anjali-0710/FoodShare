/**
 * FoodShare AI Platform - Integration Test Validation Harness
 * Runs on standard Node.js (Node 18+ native fetch support).
 * Verifies backend REST and AI APIs.
 */

const BACKEND_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting API Verification Tests...');
  
  try {
    // 1. Health check
    console.log('\nStep 1: Checking server health...');
    const healthRes = await fetch('http://localhost:5000/health');
    const healthData = await healthRes.json();
    console.log('✅ Server Status:', healthData.status, 'Time:', healthData.timestamp);

    // 2. Register a new Donor
    console.log('\nStep 2: Registering a test Donor...');
    const testEmail = `baker-${Date.now()}@foodshare.com`;
    const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
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
        longitude: 77.2177
      })
    });
    const regData = await regRes.json();
    if (!regData.success) throw new Error(regData.message);

    // Verify OTP to activate user and acquire token
    const verifyRes = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: regData.code
      })
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) throw new Error(verifyData.message);
    const token = verifyData.token;
    console.log('✅ Donor registered and OTP verified! Token acquired.');

    // 3. Login User
    console.log('\nStep 3: Logging in with registered user...');
    const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) throw new Error(loginData.message);
    console.log('✅ Login authorized! User profile resolved:', loginData.user.name);

    // 4. Test AI Freshness calculation
    console.log('\nStep 4: Requesting AI Freshness decay forecast...');
    const nowStr = new Date().toISOString();
    const expiryStr = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8 hrs shelf life
    const freshnessRes = await fetch(
      `${BACKEND_URL}/ai/freshness?foodType=Cooked%20Food&preparationTime=${nowStr}&bestBeforeDate=${expiryStr}&temperature=29`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const freshnessData = await freshnessRes.json();
    if (!freshnessData.success) throw new Error(freshnessData.message);
    console.log(`✅ AI Freshness Score: ${freshnessData.freshnessScore}% | Safety: ${freshnessData.status}`);

    // 5. Test NGO recommendation coordinates matchmaking
    console.log('\nStep 5: Testing Smart NGO Recommendation coords...');
    const ngoRes = await fetch(`${BACKEND_URL}/ai/recommend-ngos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        latitude: 28.6304,
        longitude: 77.2177,
        foodType: 'Cooked Food',
        quantity: 40
      })
    });
    const ngoData = await ngoRes.json();
    if (!ngoData.success) throw new Error(ngoData.message);
    console.log('✅ Matching NGOs computed successfully:');
    ngoData.recommendations.forEach((rec, idx) => {
      console.log(`  [NGO #${idx + 1}] Name: ${rec.name} | Distance: ${rec.distanceKm} km | Score: ${rec.matchScore}%`);
    });

    // 6. Create Surplus Donation
    console.log('\nStep 6: Publishing surplus food listing...');
    const donateRes = await fetch(`${BACKEND_URL}/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
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
        additionalNotes: 'Freshly cooked rice from afternoon event.'
      })
    });
    const donateData = await donateRes.json();
    if (!donateData.success) throw new Error(donateData.message);
    console.log(`✅ Donation listed successfully! ID: ${donateData.donation.id || donateData.donation._id} | QR Token: ${donateData.donation.qrCode}`);

    // 7. Get user's donations list
    console.log('\nStep 7: Reading user posted listings...');
    const listRes = await fetch(`${BACKEND_URL}/donations?mine=true`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const listData = await listRes.json();
    if (!listData.success) throw new Error(listData.message);
    console.log(`✅ Active postings found: ${listData.donations.length}`);

    // 8. Demand forecasting
    console.log('\nStep 8: Fetching system-wide demand prediction forecasts...');
    const demandRes = await fetch(`${BACKEND_URL}/ai/demand`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const demandData = await demandRes.json();
    if (!demandData.success) throw new Error(demandData.message);
    console.log('✅ AI demand prediction returned successfully:');
    demandData.predictions.forEach((p) => {
      console.log(`  [Demand] Category: ${p.category} | Predicted: ${p.predictedDemandKg} Kg | Confidence: ${p.confidence}%`);
    });

    // 9. Forgot and Reset Password Flow
    console.log('\nStep 9: Testing Forgot & Reset Password Flow...');
    const forgotEmail = `forgot-${Date.now()}@foodshare.com`;
    
    // Register temporary user
    const tempReg = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Temporary Reset Tester',
        email: forgotEmail,
        password: 'initialpassword123',
        role: 'volunteer',
        contactNumber: '+919999000011',
        address: 'Test Suite Lab, Delhi'
      })
    });
    const tempRegData = await tempReg.json();
    if (!tempRegData.success) throw new Error(`Temp registration failed: ${tempRegData.message}`);

    // Verify OTP to activate temp user
    const tempVerifyRes = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: forgotEmail,
        code: tempRegData.code
      })
    });
    const tempVerifyData = await tempVerifyRes.json();
    if (!tempVerifyData.success) throw new Error(`Temp OTP verification failed: ${tempVerifyData.message}`);

    // Request forgot password code
    const forgotRes = await fetch(`${BACKEND_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail })
    });
    const forgotData = await forgotRes.json();
    if (!forgotData.success) throw new Error(`Forgot password call failed: ${forgotData.message}`);
    const code = forgotData.code;
    console.log(`✅ Forgot password code generated: ${code}`);

    // Reset password with code
    const resetRes = await fetch(`${BACKEND_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: forgotEmail,
        code: code,
        newPassword: 'newsecurepassword456'
      })
    });
    const resetData = await resetRes.json();
    if (!resetData.success) throw new Error(`Password reset call failed: ${resetData.message}`);
    console.log('✅ Password updated successfully using validation code.');

    // Try logging in with the new password
    const verifyLoginRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: forgotEmail,
        password: 'newsecurepassword456'
      })
    });
    const verifyLoginData = await verifyLoginRes.json();
    if (!verifyLoginData.success) throw new Error(`Login with new password failed: ${verifyLoginData.message}`);
    console.log('✅ Login authorized with updated credentials!');

    console.log('\n🎉 ALL INTEGRATION API TESTS COMPLETED SUCCESSFULLY! ✅');
  } catch (err) {
    console.error('\n❌ TEST HARNESS RUN ENCOUNTERED AN ERROR:', err.message);
    process.exit(1);
  }
}

runTests();
