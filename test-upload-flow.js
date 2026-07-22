/**
 * FoodShare AI Platform - Image Upload Module Integration Test Harness
 * Runs on standard Node.js (Node 18+ native fetch support).
 * Verifies backend Upload APIs, validations, static serving, and local file storage.
 */

const BACKEND_URL = 'http://localhost:5000/api';
const UPLOADS_STATIC_URL = 'http://localhost:5000/uploads';

// Small valid PNG base64 representation (1x1 pixels transparent)
const VALID_BASE64_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Simulated invalid format (missing header)
const INVALID_HEADER_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Simulated unsupported extension (PDF extension header)
const UNSUPPORTED_PDF_BASE64 = 'data:application/pdf;base64,JVBERi0xLjQKJdcfggoxIDAgb2JqCjw8L0xlbmd0aCA2L0ZpbHRlci9GbGF0ZURlY29kZT4+c3RyZWFtCngBwzEAAgAFAAIB/QoNZW5kc3RyZWFtCmVuZG9iag==';

// Simulated large base64 string (> 5MB)
// 5MB of bytes translates to roughly 6.67 million base64 characters
const OVERSIZED_BASE64 = 'data:image/jpeg;base64,' + 'A'.repeat(7 * 1024 * 1024);

async function runTests() {
  console.log('🧪 Starting Image Upload Integration Tests...\n');

  try {
    // 1. Health check
    console.log('Step 1: Verify backend server health...');
    const healthRes = await fetch('http://localhost:5000/health');
    const healthData = await healthRes.json();
    console.log(`✅ Server Status: ${healthData.status} | Environment: ${healthData.environment}\n`);

    // 2. Register test Donor
    console.log('Step 2: Registering a test Donor for upload authorization...');
    const testEmail = `uploader-${Date.now()}@foodshare.com`;
    const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Upload Test Facility',
        email: testEmail,
        password: 'password123',
        role: 'donor',
        contactNumber: '+919999888877',
        address: 'MG Road Test Centre, Bangalore',
        latitude: 12.9716,
        longitude: 77.5946
      })
    });
    const regData = await regRes.json();
    if (!regData.success) throw new Error(`Registration failed: ${regData.message}`);

    // Verify OTP to get token
    const verifyRes = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, code: regData.code })
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) throw new Error(`OTP verification failed: ${verifyData.message}`);
    const token = verifyData.token;
    console.log(`✅ Test Donor registered and OTP verified: ${verifyData.user.name}\n`);

    // 3. Test Invalid Base64 Format Validation
    console.log('Step 3: Testing invalid base64 prefix header validation...');
    const errFormatRes = await fetch(`${BACKEND_URL}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ image: INVALID_HEADER_BASE64 })
    });
    const errFormatData = await errFormatRes.json();
    console.log('HTTP Status:', errFormatRes.status);
    console.log('Response Success State:', errFormatData.success);
    console.log('Response Message:', errFormatData.message);
    if (errFormatRes.status !== 400 || errFormatData.success !== false) {
      throw new Error('Server did not correctly block invalid base64 prefix format');
    }
    console.log('✅ Correctly blocked invalid base64 header format.\n');

    // 4. Test Unsupported Extension Validation
    console.log('Step 4: Testing unsupported document type (PDF) validation...');
    const errExtRes = await fetch(`${BACKEND_URL}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ image: UNSUPPORTED_PDF_BASE64 })
    });
    const errExtData = await errExtRes.json();
    console.log('HTTP Status:', errExtRes.status);
    console.log('Response Success State:', errExtData.success);
    console.log('Response Message:', errExtData.message);
    if (errExtRes.status !== 400 || errExtData.success !== false) {
      throw new Error('Server did not correctly block unsupported extension');
    }
    console.log('✅ Correctly blocked unsupported PDF document extension.\n');

    // 5. Test Oversized Image (>5MB) Validation
    console.log('Step 5: Testing oversized image file size validation...');
    const errSizeRes = await fetch(`${BACKEND_URL}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ image: OVERSIZED_BASE64 })
    });
    const errSizeData = await errSizeRes.json();
    console.log('HTTP Status:', errSizeRes.status);
    console.log('Response Success State:', errSizeData.success);
    console.log('Response Message:', errSizeData.message);
    if (errSizeRes.status !== 400 || errSizeData.success !== false) {
      throw new Error('Server did not correctly block file exceeding 5MB limit');
    }
    console.log('✅ Correctly blocked image exceeding 5MB size limit.\n');

    // 6. Test Valid Base64 Image Upload
    console.log('Step 6: Testing valid base64 image upload...');
    const uploadRes = await fetch(`${BACKEND_URL}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ image: VALID_BASE64_PNG })
    });
    const uploadData = await uploadRes.json();
    console.log('HTTP Status:', uploadRes.status);
    console.log('Response:', uploadData);
    if (!uploadData.success || !uploadData.url || !uploadData.filename) {
      throw new Error(`Valid image upload failed: ${uploadData.message}`);
    }
    console.log('✅ Valid image upload processed successfully!');
    console.log(`Uploaded Location URL: ${uploadData.url}\n`);

    // 7. Verify Static Serving of Uploaded File
    console.log('Step 7: Verifying public static serving of saved file...');
    const staticRes = await fetch(uploadData.url);
    console.log(`Fetch HTTP Status: ${staticRes.status}`);
    if (staticRes.status !== 200) {
      throw new Error(`Static image URL returned HTTP status ${staticRes.status}`);
    }
    const contentType = staticRes.headers.get('content-type');
    console.log(`Content-Type served: ${contentType}`);
    if (!contentType || !contentType.startsWith('image/png')) {
      throw new Error(`Expected image/png content-type header, got: ${contentType}`);
    }
    console.log('✅ Static serving verification successful!\n');

    console.log('🎉 ALL IMAGE UPLOAD INTEGRATION TESTS COMPLETED SUCCESSFULLY! 🎉');

  } catch (error) {
    console.error('❌ Integration test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

runTests();
