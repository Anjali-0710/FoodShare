/**
 * FoodShare AI Platform - Maps & Location Module Integration Test Harness
 * Verifies end-to-end maps/location functionality: Haversine distance, bounds validation, and routing ETA calculations.
 */

const BACKEND_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Maps & Location Module Integration Tests...');
  
  try {
    // 1. Register a user and verify OTP to obtain a valid access token
    console.log('\nStep 1: Registering a donor user and verifying OTP...');
    const testEmail = `donor-maps-${Date.now()}@foodshare.com`;
    const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Maps Test Donor',
        email: testEmail,
        password: 'password123',
        role: 'donor',
        contactNumber: '+919999000222',
        address: 'MG Road, Bangalore',
        latitude: 12.9716,
        longitude: 77.5946
      })
    });
    const regData = await regRes.json();
    if (!regData.success) {
      throw new Error(`Donor registration failed: ${regData.message}`);
    }

    const verifyRes = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, code: regData.code })
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      throw new Error(`OTP verification failed: ${verifyData.message}`);
    }
    const token = verifyData.token;
    console.log('✅ Registered and logged in successfully! Token acquired.');

    // 2. Test Distance Calculation
    console.log('\nStep 2: Testing Haversine Distance calculations between two Bangalore points...');
    const distRes = await fetch(`${BACKEND_URL}/location/distance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        lat1: 12.9716, // Bangalore Hub (Kanteerava Stadium area)
        lon1: 77.5946,
        lat2: 12.9784, // Indiranagar Metro area
        lon2: 77.6408
      })
    });
    const distData = await distRes.json();
    if (!distRes.ok || !distData.success) {
      throw new Error(`Distance calculation failed: ${distData.message}`);
    }
    console.log(`✅ Distance calculation succeeded: ${distData.distance} km`);
    // Expected distance is ~5.07 km. Let's assert it falls in [4.8, 5.4] km
    if (distData.distance < 4.8 || distData.distance > 5.4) {
      throw new Error(`Assert failed: Expected distance ~5km, got ${distData.distance} km`);
    }

    // 3. Test Location Validation (Valid nearby location)
    console.log('\nStep 3: Validating a coordinate close to the Bangalore operating hub...');
    const valRes1 = await fetch(`${BACKEND_URL}/location/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        latitude: 12.9800,
        longitude: 77.6000
      })
    });
    const valData1 = await valRes1.json();
    if (!valRes1.ok || !valData1.success) {
      throw new Error(`Validation API error: ${valData1.message}`);
    }
    console.log(`✅ Validation status: valid=${valData1.valid} | message: "${valData1.message}"`);
    if (!valData1.valid) {
      throw new Error('Assert failed: Expected coordinate near hub to be valid.');
    }

    // 4. Test Location Validation (Invalid far away location > 100km)
    console.log('\nStep 4: Validating a coordinate far from the Bangalore operating hub (Delhi coordinates)...');
    const valRes2 = await fetch(`${BACKEND_URL}/location/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        latitude: 28.6139, // Delhi
        longitude: 77.2090
      })
    });
    const valData2 = await valRes2.json();
    if (!valRes2.ok || !valData2.success) {
      throw new Error(`Validation API error: ${valData2.message}`);
    }
    console.log(`✅ Validation status: valid=${valData2.valid} | message: "${valData2.message}"`);
    if (valData2.valid) {
      throw new Error('Assert failed: Expected coordinate in Delhi to be out of operating boundaries.');
    }

    // 5. Test Location Validation (Invalid range bounds coordinates)
    console.log('\nStep 5: Validating coordinates outside latitude range bounds...');
    const valRes3 = await fetch(`${BACKEND_URL}/location/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        latitude: 95.0, // Out of [-90, 90] bounds
        longitude: 77.2090
      })
    });
    const valData3 = await valRes3.json();
    if (!valRes3.ok || !valData3.success) {
      throw new Error(`Validation API error: ${valData3.message}`);
    }
    console.log(`✅ Validation status: valid=${valData3.valid} | message: "${valData3.message}"`);
    if (valData3.valid) {
      throw new Error('Assert failed: Expected coordinate lat=95 to be rejected.');
    }

    // 6. Test Multi-Leg route and ETA calculations
    console.log('\nStep 6: Requesting volunteer route tracking legs and driving ETA...');
    const etaRes = await fetch(`${BACKEND_URL}/location/route-eta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        volunteerLat: 12.9300, // Jayanagar
        volunteerLon: 77.5800,
        donorLat: 12.9716,     // Bangalore Hub
        donorLon: 77.5946,
        ngoLat: 12.9482,       // Lalbagh area NGO
        ngoLon: 77.5684
      })
    });
    const etaData = await etaRes.json();
    if (!etaRes.ok || !etaData.success) {
      throw new Error(`Route ETA calculation failed: ${etaData.message}`);
    }
    console.log('✅ Route ETA calculations succeeded:');
    console.log(`  - Total Route Distance: ${etaData.route.totalDistance} km`);
    console.log(`  - Estimated Total Time: ${etaData.route.totalDuration} Mins`);
    console.log('  - Legs segment detail:');
    etaData.route.legs.forEach((leg, idx) => {
      console.log(`    Leg ${idx+1}: "${leg.name}" | Distance: ${leg.distance} km | Time: ${leg.duration} Mins`);
    });

    if (etaData.route.totalDistance <= 0 || etaData.route.totalDuration <= 0) {
      throw new Error('Assert failed: Expected non-zero distance and travel duration values.');
    }
    if (etaData.route.legs.length !== 2) {
      throw new Error(`Assert failed: Expected exactly 2 legs for the transit, got ${etaData.route.legs.length}`);
    }

    console.log('\n🎉 ALL MAPS & LOCATION MODULE API TESTS PASSED SUCCESSFULLY! ✅');
  } catch (err) {
    console.error('\n❌ MAPS MODULE TEST HARNESS RUN ENCOUNTERED AN ERROR:', err.message);
    process.exit(1);
  }
}

runTests();
