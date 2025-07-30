#!/usr/bin/env node

/**
 * Quick API Test Script for Unified Recording System
 * Run with: node test-api.js
 */

const BASE_URL = 'http://localhost:3000';

// Test data
const testRecording = {
  userId: 'test-user-' + Date.now(),
  roomName: 'test-room-' + Date.now(),
  timestamp: Date.now().toString(),
  recordingId: 'test-recording-' + Date.now(),
  recordingName: 'Test Recording ' + new Date().toLocaleString(),
  estimatedParts: 5,
  quality: 'medium'
};

async function testAPI() {
  console.log('🧪 Testing Unified Recording System APIs...\n');

  try {
    // Test 1: Multipart Initiate API
    console.log('1️⃣ Testing Multipart Initiate API...');
    const initiateResponse = await fetch(`${BASE_URL}/api/recordings/multipart/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testRecording)
    });

    if (!initiateResponse.ok) {
      throw new Error(`Initiate API failed: ${initiateResponse.status} ${initiateResponse.statusText}`);
    }

    const initiateData = await initiateResponse.json();
    console.log('✅ Initiate API successful');
    console.log('   Upload ID:', initiateData.uploadId);
    console.log('   Presigned URLs:', initiateData.presignedUrls.length);
    console.log('   Max Parts:', initiateData.maxParts);
    console.log('   Key:', initiateData.key);

    // Test 2: Status API
    console.log('\n2️⃣ Testing Status API...');
    const statusResponse = await fetch(
      `${BASE_URL}/api/recordings/multipart/status?uploadId=${initiateData.uploadId}&key=${initiateData.key}`
    );

    if (!statusResponse.ok) {
      throw new Error(`Status API failed: ${statusResponse.status} ${statusResponse.statusText}`);
    }

    const statusData = await statusResponse.json();
    console.log('✅ Status API successful');
    console.log('   Status:', statusData.status);
    console.log('   Progress:', statusData.progress + '%');

    // Test 3: List API
    console.log('\n3️⃣ Testing List API...');
    const listResponse = await fetch(
      `${BASE_URL}/api/recordings/list?limit=5&offset=0&sortBy=timestamp&sortOrder=desc`
    );

    if (!listResponse.ok) {
      throw new Error(`List API failed: ${listResponse.status} ${listResponse.statusText}`);
    }

    const listData = await listResponse.json();
    console.log('✅ List API successful');
    console.log('   Total recordings:', listData.pagination?.total || 0);
    console.log('   Returned:', listData.recordings?.length || 0);
    console.log('   Summary:', listData.summary);

    // Test 4: Abort API (clean up the test upload)
    console.log('\n4️⃣ Testing Abort API (cleanup)...');
    const abortResponse = await fetch(`${BASE_URL}/api/recordings/multipart/abort`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId: initiateData.uploadId,
        key: initiateData.key
      })
    });

    if (abortResponse.ok) {
      const abortData = await abortResponse.json();
      console.log('✅ Abort API successful');
      console.log('   Message:', abortData.message);
    } else {
      console.log('⚠️ Abort API failed (may have already been cleaned up)');
      console.log('   Status:', abortResponse.status);
    }

    console.log('\n🎉 All API tests completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Navigate to a meeting room');
    console.log('   3. Test the recording button functionality');
    console.log('   4. Check browser console for debug logs');
    console.log('   5. Follow the TESTING_GUIDE.md for comprehensive testing');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure the development server is running');
    console.log('   2. Check your environment variables');
    console.log('   3. Verify AWS S3 configuration');
    console.log('   4. Check the browser console for detailed errors');
  }
}

// Run the test
testAPI(); 