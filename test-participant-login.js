// Test script for participant login API
const testParticipantLogin = async () => {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing Participant Login API...\n');
  
  // Test 1: Valid login
  console.log('Test 1: Valid login with John Doe');
  try {
    const response = await fetch(`${baseUrl}/api/participant-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'john@example.com',
        password: 'password123'
      }),
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    console.log('✅ Test 1 passed\n');
  } catch (error) {
    console.log('❌ Test 1 failed:', error.message, '\n');
  }
  
  // Test 2: Invalid credentials
  console.log('Test 2: Invalid credentials');
  try {
    const response = await fetch(`${baseUrl}/api/participant-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      }),
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    console.log('✅ Test 2 passed\n');
  } catch (error) {
    console.log('❌ Test 2 failed:', error.message, '\n');
  }
  
  // Test 3: Missing fields
  console.log('Test 3: Missing email field');
  try {
    const response = await fetch(`${baseUrl}/api/participant-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: 'password123'
      }),
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    console.log('✅ Test 3 passed\n');
  } catch (error) {
    console.log('❌ Test 3 failed:', error.message, '\n');
  }
  
  // Test 4: GET request
  console.log('Test 4: GET request');
  try {
    const response = await fetch(`${baseUrl}/api/participant-login`, {
      method: 'GET',
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    console.log('✅ Test 4 passed\n');
  } catch (error) {
    console.log('❌ Test 4 failed:', error.message, '\n');
  }
  
  console.log('🎉 All tests completed!');
};

// Run the tests
testParticipantLogin(); 