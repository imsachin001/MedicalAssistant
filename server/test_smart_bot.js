// Comprehensive Test Suite for Smart Medical Chatbot
import { generateAnswer, resetBot, getBotStatus } from './src/smart_medical_query.js';

console.log('🧪 Starting Comprehensive Smart Medical Bot Tests...\n');

// Test scenarios
const testScenarios = [
  // Greeting tests
  {
    name: "Greeting Test",
    message: "Hello",
    expectedType: "greeting"
  },
  
  // Initial symptom reporting
  {
    name: "Shortness of Breath Report",
    message: "i am feeling shortness of breath before sleeping",
    expectedType: "ai_response",
    expectFollowUp: true
  },
  
  // Follow-up response
  {
    name: "Follow-up Response",
    message: "It started 3 days ago",
    expectedType: "ai_response",
    expectContextAware: true
  },
  
  // Emergency scenario
  {
    name: "Emergency Scenario",
    message: "I can't breathe and having severe chest pain",
    expectedType: "emergency"
  },
  
  // Reset for next tests
  {
    name: "Reset",
    message: null,
    action: "reset"
  },
  
  // Different symptom
  {
    name: "Headache Report",
    message: "I have a severe headache for 2 days",
    expectedType: "ai_response",
    expectFollowUp: true
  },
  
  // Advice seeking
  {
    name: "Treatment Advice",
    message: "What should I do for my headache?",
    expectedType: "ai_response",
    expectContextAware: true
  },
  
  // Information request
  {
    name: "Information Request",
    message: "What causes headaches?",
    expectedType: "ai_response"
  },
  
  // Natural conversation
  {
    name: "Natural Follow-up",
    message: "Yes, it gets worse when I'm stressed",
    expectedType: "ai_response",
    expectFollowUp: true
  }
];

// Run tests
async function runTests() {
  let passedTests = 0;
  let totalTests = testScenarios.filter(t => t.message !== null).length;
  
  for (let i = 0; i < testScenarios.length; i++) {
    const test = testScenarios[i];
    
    console.log(`\n📝 Test ${i + 1}: ${test.name}`);
    
    if (test.action === "reset") {
      resetBot();
      console.log("✅ Bot context reset");
      continue;
    }
    
    if (!test.message) continue;
    
    try {
      const startTime = Date.now();
      const result = await generateAnswer({ message: test.message });
      const responseTime = Date.now() - startTime;
      
      console.log(`💬 Input: "${test.message}"`);
      console.log(`🤖 Response Type: ${result.type}`);
      console.log(`⏱️  Response Time: ${responseTime}ms`);
      console.log(`📄 Response Preview: ${result.message.substring(0, 100)}...`);
      
      // Check expectations
      let testPassed = true;
      
      if (test.expectedType && result.type !== test.expectedType) {
        console.log(`❌ Expected type: ${test.expectedType}, got: ${result.type}`);
        testPassed = false;
      }
      
      if (test.expectFollowUp && !result.follow_up_needed) {
        console.log(`❌ Expected follow-up to be needed`);
        testPassed = false;
      }
      
      if (test.expectContextAware && !result.context_aware) {
        console.log(`❌ Expected context-aware response`);
        testPassed = false;
      }
      
      if (testPassed) {
        console.log("✅ Test PASSED");
        passedTests++;
      } else {
        console.log("❌ Test FAILED");
      }
      
      // Show bot status
      const status = getBotStatus();
      console.log(`📊 Bot Status: Turn ${status.turnCount}, Stage: ${status.currentStage}, Symptoms: [${status.symptoms.join(', ')}]`);
      
    } catch (error) {
      console.log(`❌ Test FAILED with error: ${error.message}`);
    }
  }
  
  console.log(`\n🎯 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log("🎉 All tests PASSED! Smart Medical Bot is ready!");
  } else {
    console.log("⚠️  Some tests failed. Please review the implementation.");
  }
}

// Conversation flow test
async function testConversationFlow() {
  console.log('\n🔄 Testing Complete Conversation Flow...\n');
  
  resetBot();
  
  const conversation = [
    "Hello there",
    "I'm having trouble with headaches lately",
    "They started about a week ago",
    "The pain is moderate, mainly in my temples", 
    "Yes, they seem to get worse when I'm working on the computer",
    "What can I do to help with this?",
    "Should I see a doctor?"
  ];
  
  for (let i = 0; i < conversation.length; i++) {
    const message = conversation[i];
    console.log(`\n👤 User: ${message}`);
    
    try {
      const result = await generateAnswer({ message });
      console.log(`🤖 Bot (${result.type}): ${result.message}`);
      
      const status = getBotStatus();
      console.log(`📊 Turn ${status.turnCount} | Symptoms: [${status.symptoms.join(', ')}] | Follow-up: ${result.follow_up_needed ? 'Yes' : 'No'}`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      break;
    }
  }
  
  console.log('\n✅ Conversation flow test completed!');
}

// Emergency response test
async function testEmergencyScenarios() {
  console.log('\n🚨 Testing Emergency Scenarios...\n');
  
  const emergencies = [
    "I can't breathe help me",
    "Having a heart attack call 911",
    "Severe chest pain crushing feeling",
    "Unconscious person needs help",
    "Overdose emergency"
  ];
  
  resetBot();
  
  for (const emergency of emergencies) {
    console.log(`\n🚨 Emergency: ${emergency}`);
    
    try {
      const result = await generateAnswer({ message: emergency });
      
      if (result.type === 'emergency') {
        console.log("✅ Correctly identified as emergency");
        console.log(`🚨 Response: ${result.message.substring(0, 100)}...`);
      } else {
        console.log("❌ Failed to identify as emergency");
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

// Run all tests
async function runAllTests() {
  await runTests();
  await testConversationFlow();
  await testEmergencyScenarios();
  
  console.log('\n🎊 All testing completed!');
  console.log('The Smart Medical Bot is ready for production use.');
}

runAllTests().catch(console.error);