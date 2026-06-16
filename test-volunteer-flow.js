/**
 * FoodShare AI Platform - Volunteer Module Integration Test Harness
 * Verifies end-to-end volunteer flow: claim, status updates, QR verification, and leaderboard.
 */

const BACKEND_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Volunteer Module Integration Tests...');
  
  try {
    const timestamp = Date.now();
    const donorEmail = `donor-${timestamp}@foodshare.com`;
    const ngoEmail = `ngo-${timestamp}@foodshare.com`;
    const volunteerEmail = `volunteer-${timestamp}@foodshare.com`;

    // 1. Register Donor
    console.log('\nStep 1: Registering donor...');
    const donorReg = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Delhi Bakery Partner',
        email: donorEmail,
        password: 'password123',
        role: 'donor',
        contactNumber: '+919999111100',
        address: 'Noida Sector 62, Delhi NCR',
        latitude: 28.63,
        longitude: 77.36
      })
    });
    const donorData = await donorReg.json();
    if (!donorData.success) throw new Error(`Donor registration failed: ${donorData.message}`);
    const donorToken = donorData.token;
    console.log('✅ Donor registered!');

    // 2. Register NGO
    console.log('\nStep 2: Registering NGO...');
    const ngoReg = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Robin Hood Food NGO',
        email: ngoEmail,
        password: 'password123',
        role: 'ngo',
        contactNumber: '+919999111122',
        address: 'South Extension, New Delhi',
        latitude: 28.57,
        longitude: 77.22
      })
    });
    const ngoData = await ngoReg.json();
    if (!ngoData.success) throw new Error(`NGO registration failed: ${ngoData.message}`);
    const ngoToken = ngoData.token;
    console.log('✅ NGO registered!');

    // 3. Register Volunteer
    console.log('\nStep 3: Registering Volunteer...');
    const volReg = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Amit Kumar',
        email: volunteerEmail,
        password: 'password123',
        role: 'volunteer',
        contactNumber: '+919999111133',
        address: 'Mayur Vihar, New Delhi',
        latitude: 28.60,
        longitude: 77.29
      })
    });
    const volData = await volReg.json();
    if (!volData.success) throw new Error(`Volunteer registration failed: ${volData.message}`);
    const volToken = volData.token;
    console.log('✅ Volunteer registered!');

    // 4. Donor posts a donation
    console.log('\nStep 4: Donor listing a fresh food donation...');
    const nowStr = new Date().toISOString();
    const expiryStr = new Date(Date.now() + 10 * 3600000).toISOString();
    const donateRes = await fetch(`${BACKEND_URL}/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${donorToken}`
      },
      body: JSON.stringify({
        foodType: 'Bakery Items',
        quantity: 50,
        unit: 'Packets',
        bestBeforeDate: expiryStr,
        preparationTime: nowStr,
        temperature: 22,
        pickupAddress: 'Noida Sector 62, Delhi NCR',
        latitude: 28.63,
        longitude: 77.36,
        contactNumber: '+919999111100',
        additionalNotes: 'Freshly baked breads and buns.'
      })
    });
    const donateData = await donateRes.json();
    if (!donateData.success) throw new Error(`Donation listing failed: ${donateData.message}`);
    const donationId = donateData.donation.id || donateData.donation._id;
    const qrCodeToken = donateData.donation.qrCode;
    console.log(`✅ Donation listed! ID: ${donationId} | QR Code: ${qrCodeToken}`);

    // 5. NGO accepts the donation
    console.log('\nStep 5: NGO accepting the donation...');
    const acceptRes = await fetch(`${BACKEND_URL}/donations/${donationId}/accept`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ngoToken}`
      }
    });
    const acceptData = await acceptRes.json();
    if (!acceptData.success) throw new Error(`NGO accept failed: ${acceptData.message}`);
    console.log('✅ NGO accepted the donation! Status is now:', acceptData.donation.status);

    // 6. Volunteer claims/assigns the task
    console.log('\nStep 6: Volunteer claiming/assigning the delivery task...');
    const claimRes = await fetch(`${BACKEND_URL}/donations/${donationId}/assign`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${volToken}`
      }
    });
    const claimData = await claimRes.json();
    if (!claimData.success) throw new Error(`Volunteer assignment failed: ${claimData.message}`);
    console.log('✅ Volunteer assigned! Donation status is now:', claimData.donation.status);

    // 7. Check volunteer's active pickups
    console.log('\nStep 7: Verifying volunteer active pickups listing...');
    const pickupsRes = await fetch(`${BACKEND_URL}/volunteer/pickups`, {
      headers: { 'Authorization': `Bearer ${volToken}` }
    });
    const pickupsData = await pickupsRes.json();
    if (!pickupsData.success) throw new Error(`Fetch pickups failed: ${pickupsData.message}`);
    console.log(`✅ Active pickups found: ${pickupsData.pickups.length}`);
    if (pickupsData.pickups.length !== 1) throw new Error('Expected exactly 1 active pickup for the volunteer!');

    // 8. Volunteer confirms Pickup (Picked Up)
    console.log('\nStep 8: Volunteer confirming pickup...');
    const pickupConfirmRes = await fetch(`${BACKEND_URL}/donations/${donationId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${volToken}`
      },
      body: JSON.stringify({ status: 'Picked Up' })
    });
    const pickupConfirmData = await pickupConfirmRes.json();
    if (!pickupConfirmData.success) throw new Error(`Status update to Picked Up failed: ${pickupConfirmData.message}`);
    console.log('✅ Pickup confirmed! Donation status is now:', pickupConfirmData.donation.status);

    // 9. Volunteer confirms Arrived/Delivered
    console.log('\nStep 9: Volunteer marking task as Delivered...');
    const deliverConfirmRes = await fetch(`${BACKEND_URL}/donations/${donationId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${volToken}`
      },
      body: JSON.stringify({ status: 'Delivered' })
    });
    const deliverConfirmData = await deliverConfirmRes.json();
    if (!deliverConfirmData.success) throw new Error(`Status update to Delivered failed: ${deliverConfirmData.message}`);
    console.log('✅ Delivered confirmed! Donation status is now:', deliverConfirmData.donation.status);

    // 10. QR Verification completes the process
    console.log('\nStep 10: NGO scans and verifies QR code...');
    const qrVerifyRes = await fetch(`${BACKEND_URL}/donations/verify-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ngoToken}` // Can be NGO or Volunteer verifying
      },
      body: JSON.stringify({ qrCode: qrCodeToken })
    });
    const qrVerifyData = await qrVerifyRes.json();
    if (!qrVerifyData.success) throw new Error(`QR verification failed: ${qrVerifyData.message}`);
    console.log('✅ QR Verified! Final donation status is now:', qrVerifyData.donation.status);

    // 11. Verify leaderboard reflects points update
    console.log('\nStep 11: Checking leaderboard updates...');
    const leaderboardRes = await fetch(`${BACKEND_URL}/volunteer/leaderboard`, {
      headers: { 'Authorization': `Bearer ${volToken}` }
    });
    const leaderboardData = await leaderboardRes.json();
    if (!leaderboardData.success) throw new Error(`Fetch leaderboard failed: ${leaderboardData.message}`);
    
    const matchedVol = leaderboardData.leaderboard.find(u => u.name === 'Amit Kumar');
    if (!matchedVol) {
      console.log('⚠️ Could not find registered volunteer in top leaderboard listing.');
    } else {
      console.log(`✅ Leaderboard stats - Name: ${matchedVol.name} | Points: ${matchedVol.volunteerScore} | Completed: ${matchedVol.completedPickups}`);
      if (matchedVol.volunteerScore !== 50 || matchedVol.completedPickups !== 1) {
        throw new Error(`Expected volunteer score of 50 and 1 completed pickup, got points: ${matchedVol.volunteerScore}, completed: ${matchedVol.completedPickups}`);
      }
    }

    console.log('\n🎉 ALL VOLUNTEER MODULE API TESTS PASSED SUCCESSFULLY! ✅');
  } catch (err) {
    console.error('\n❌ TEST HARNESS RUN ENCOUNTERED AN ERROR:', err.message);
    process.exit(1);
  }
}

runTests();
