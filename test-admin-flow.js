/**
 * FoodShare AI Platform - Admin Analytics & Reports Module Integration Test Harness
 * Verifies end-to-end admin capabilities: User CRUD, activation toggles, donation status revisions, logs, analytics, and reports.
 */

const BACKEND_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting Admin Analytics & Reports Module Integration Tests...');
  
  try {
    // 1. Log in as Admin
    console.log('\nStep 1: Logging in as Admin...');
    const adminLoginRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@foodshare.com',
        password: 'password123'
      })
    });
    const adminLoginData = await adminLoginRes.json();
    if (!adminLoginData.success) {
      throw new Error(`Admin login failed: ${adminLoginData.message}`);
    }
    const adminToken = adminLoginData.token;
    console.log('✅ Admin logged in successfully!');

    // 2. Fetch Analytics & Counters
    console.log('\nStep 2: Fetching system analytics...');
    const analyticsRes = await fetch(`${BACKEND_URL}/admin/analytics`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const analyticsData = await analyticsRes.json();
    if (!analyticsData.success) {
      throw new Error(`Analytics retrieval failed: ${analyticsData.message}`);
    }
    console.log('✅ Analytics retrieved. Statistics counters:');
    console.log(JSON.stringify(analyticsData.stats, null, 2));
    if (analyticsData.stats.totalDonations === undefined || analyticsData.stats.foodSavedKg === undefined) {
      throw new Error('Analytics statistics keys are missing standard attributes.');
    }

    // 3. Register a temporary user to moderate
    console.log('\nStep 3: Registering a temporary donor user for moderation...');
    const timestamp = Date.now();
    const tempUserEmail = `temp-donor-${timestamp}@foodshare.com`;
    const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Temporary Test Donor',
        email: tempUserEmail,
        password: 'password123',
        role: 'donor',
        contactNumber: '+919999000111',
        address: 'Whitefield, Bangalore'
      })
    });
    const regData = await regRes.json();
    if (!regData.success) {
      throw new Error(`Temp user registration failed: ${regData.message}`);
    }
    const tempDonorToken = regData.token;
    const tempUserId = regData.user.id || regData.user._id;
    console.log(`✅ Temporary user registered! ID: ${tempUserId}`);

    // 4. Retrieve Users Directory
    console.log('\nStep 4: Fetching users list via Admin API...');
    const usersRes = await fetch(`${BACKEND_URL}/admin/users`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const usersData = await usersRes.json();
    if (!usersData.success) {
      throw new Error(`Failed to fetch user directory: ${usersData.message}`);
    }
    console.log(`✅ Users directory retrieved. Total users found: ${usersData.users.length}`);
    const foundUser = usersData.users.find(u => (u.id === tempUserId || u._id === tempUserId));
    if (!foundUser) {
      throw new Error('Could not find newly registered temporary user in user directory.');
    }
    console.log('✅ Temp user exists in Admin directory. Current status is active:', foundUser.isActive !== false);

    // 5. Update/Edit User Details
    console.log('\nStep 5: Updating user details...');
    const updateRes = await fetch(`${BACKEND_URL}/admin/users/${tempUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Modified Temp Donor Name',
        email: tempUserEmail,
        role: 'donor',
        contactNumber: '+919999000999',
        address: 'Electronic City, Bangalore'
      })
    });
    const updateData = await updateRes.json();
    if (!updateData.success) {
      throw new Error(`Editing user record failed: ${updateData.message}`);
    }
    console.log('✅ User details updated! Response user name is:', updateData.user.name);
    if (updateData.user.name !== 'Modified Temp Donor Name') {
      throw new Error('User name modification check failed.');
    }

    // 6. Toggle User Activation Status (Deactivate)
    console.log('\nStep 6: Deactivating user account...');
    const statusRes = await fetch(`${BACKEND_URL}/admin/users/${tempUserId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ isActive: false })
    });
    const statusData = await statusRes.json();
    if (!statusData.success) {
      throw new Error(`Deactivation toggle failed: ${statusData.message}`);
    }
    console.log('✅ User account deactivated! Account isActive state is:', statusData.user.isActive);
    if (statusData.user.isActive !== false) {
      throw new Error('User account isActive state should be false.');
    }

    // 7. Post a temporary donation, accept it, then moderate it
    console.log('\nStep 7: Creating a donation to test moderation...');
    const nowStr = new Date().toISOString();
    const expiryStr = new Date(Date.now() + 12 * 3600000).toISOString();
    const donateRes = await fetch(`${BACKEND_URL}/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tempDonorToken}`
      },
      body: JSON.stringify({
        foodType: 'Fruits',
        quantity: 10,
        unit: 'Kg',
        bestBeforeDate: expiryStr,
        preparationTime: nowStr,
        temperature: 20,
        pickupAddress: 'Electronic City, Bangalore',
        latitude: 12.97,
        longitude: 77.59,
        contactNumber: '+919999000999',
        additionalNotes: 'Freshly sorted oranges.'
      })
    });
    const donateData = await donateRes.json();
    if (!donateData.success) {
      throw new Error(`Temp donation listing failed: ${donateData.message}`);
    }
    const tempDonationId = donateData.donation.id || donateData.donation._id;
    console.log(`✅ Donation posted! ID: ${tempDonationId}`);

    // 8. Fetch Donations List (Admin View)
    console.log('\nStep 8: Fetching all donations via Admin list directory...');
    const donationsRes = await fetch(`${BACKEND_URL}/admin/donations`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const donationsData = await donationsRes.json();
    if (!donationsData.success) {
      throw new Error(`Admin donation retrieval failed: ${donationsData.message}`);
    }
    console.log(`✅ Donations listing retrieved. Total posts: ${donationsData.donations.length}`);
    const foundDonation = donationsData.donations.find(d => (d.id === tempDonationId || d._id === tempDonationId));
    if (!foundDonation) {
      throw new Error('Temp donation not found in admin directory.');
    }

    // 9. Update Donation Status (Admin override)
    console.log('\nStep 9: Updating donation status to Completed (Admin override)...');
    const overrideRes = await fetch(`${BACKEND_URL}/admin/donations/${tempDonationId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Completed' })
    });
    const overrideData = await overrideRes.json();
    if (!overrideData.success) {
      throw new Error(`Admin donation status override failed: ${overrideData.message}`);
    }
    console.log('✅ Donation status overridden! Current state is:', overrideData.donation.status);
    if (overrideData.donation.status !== 'Completed') {
      throw new Error('Override status check failed.');
    }

    // 10. Fetch Audit Logs
    console.log('\nStep 10: Fetching chronological system audit logs...');
    const logsRes = await fetch(`${BACKEND_URL}/admin/logs`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const logsData = await logsRes.json();
    if (!logsData.success) {
      throw new Error(`Failed to fetch audit logs: ${logsData.message}`);
    }
    console.log(`✅ System logs retrieved. Last ${logsData.logs.length} operations. Sample actions:`);
    logsData.logs.slice(0, 4).forEach(l => {
      console.log(`  - [${l.action}] by ${l.performedBy} (${l.role}): ${l.details}`);
    });
    // Check if the latest logs contain our deactivation actions
    const hasLog = logsData.logs.some(l => l.details.includes(tempUserId) || l.details.includes(tempDonationId));
    if (!hasLog) {
      console.log('⚠️ Warning: Expected edit/deactivate log details was not immediately returned.');
    }

    // 11. Fetch System Reports Data
    console.log('\nStep 11: Fetching system reports compiling arrays...');
    const reportsRes = await fetch(`${BACKEND_URL}/admin/reports`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const reportsData = await reportsRes.json();
    if (!reportsData.success) {
      throw new Error(`System reports fetch failed: ${reportsData.message}`);
    }
    console.log('✅ System reports compiled successfully. Rows compiled:');
    console.log(`  - Donations records count: ${reportsData.reports.donations.length}`);
    console.log(`  - Registered users count: ${reportsData.reports.users.length}`);
    console.log(`  - NGO performance count: ${reportsData.reports.ngos.length}`);
    console.log(`  - Volunteer performance scorecard count: ${reportsData.reports.volunteers.length}`);

    // 12. Deletes
    console.log('\nStep 12: Admin cleaning up temporary test posts and records...');
    const deleteDonationRes = await fetch(`${BACKEND_URL}/admin/donations/${tempDonationId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const deleteDonationData = await deleteDonationRes.json();
    if (!deleteDonationData.success) {
      throw new Error(`Admin donation deletion failed: ${deleteDonationData.message}`);
    }
    console.log('✅ Temp donation deleted successfully.');

    const deleteUserRes = await fetch(`${BACKEND_URL}/admin/users/${tempUserId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const deleteUserData = await deleteUserRes.json();
    if (!deleteUserData.success) {
      throw new Error(`Admin user deletion failed: ${deleteUserData.message}`);
    }
    console.log('✅ Temp user deleted successfully.');

    console.log('\n🎉 ALL ADMIN ANALYTICS & REPORTS MODULE API TESTS PASSED SUCCESSFULLY! ✅');
  } catch (err) {
    console.error('\n❌ ADMIN MODULE TEST HARNESS RUN ENCOUNTERED AN ERROR:', err.message);
    process.exit(1);
  }
}

runTests();
