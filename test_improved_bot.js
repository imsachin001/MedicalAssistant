// Test script for improved FastSmartMedicalBot
const http = require('http');

function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testBot() {
  
  console.log('=== Testing Improved FastSmartMedicalBot ===\n');
  
  try {
    // Test 1: Fever symptom
    console.log('🔥 Test 1: Fever');
    console.log('User: i am having fever');
    
    const startTime1 = Date.now();
    const response1 = await makeRequest({
      message: 'i am having fever'
    });
    const responseTime1 = Date.now() - startTime1;
    
    console.log('Bot:', response1.answer.message);
    console.log(`🤖 ${response1.answer.model_used} • 📝 ${response1.answer.type} • ⏱️ ${responseTime1}ms\n`);
    
    // Test 2: Adding another symptom to same session
    console.log('⚡ Test 2: Adding fatigue (same session)');
    console.log('User: i am experiencing low energy too');
    
    const startTime2 = Date.now();
    const response2 = await makeRequest({
      message: 'i am experiencing low energy too',
      sessionId: response1.sessionId
    });
    const responseTime2 = Date.now() - startTime2;
    
    console.log('Bot:', response2.answer.message);
    console.log(`🤖 ${response2.answer.model_used} • 📝 ${response2.answer.type} • ⏱️ ${responseTime2}ms\n`);
    
    // Test 3: Question about system
    console.log('❓ Test 3: Question about system (same session)');
    console.log('User: how its working? very worse');
    
    const response3 = await makeRequest({
      message: 'how its working? very worse',
      sessionId: response1.sessionId
    });
    
    console.log('Bot:', response3.answer.message);
    console.log(`🤖 ${response3.answer.model_used} • 📝 ${response3.answer.type}\n`);
    
    // Test 4: New session (should not see previous symptoms)
    console.log('🆕 Test 4: New session (different user)');
    console.log('User: i have a headache');
    
    const response4 = await makeRequest({
      message: 'i have a headache'
    });
    
    console.log('Bot:', response4.answer.message);
    console.log(`🤖 ${response4.answer.model_used} • 📝 ${response4.answer.type}\n`);
    
    console.log('=== Test Complete ===');
    
  } catch (error) {
    console.error('Test error:', error.response?.data || error.message);
  }
}

testBot();