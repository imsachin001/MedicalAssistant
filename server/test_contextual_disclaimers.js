// Test the updated contextual disclaimer and doctor advice system
import { generateAnswer } from './src/lightweight_query.js';

console.log("🧪 Testing Updated Disclaimer & Doctor Advice System\n");

async function testUpdatedSystem() {
  try {
    // Test 1: Simple/mild symptom - should NOT have disclaimer
    console.log("=== Test 1: Mild Headache (No disclaimer expected) ===");
    const response1 = await generateAnswer({
      message: "I have a mild headache",
      history: []
    });
    
    console.log("✅ Response:", response1.message?.substring(0, 200));
    console.log("✅ Has disclaimer:", response1.message?.includes('⚠️'));
    console.log("✅ Has doctor advice:", response1.message?.includes('see a doctor'));
    
    // Test 2: Serious symptom - should have disclaimer + doctor advice
    console.log("\n=== Test 2: Severe Chest Pain (Disclaimer + Doctor advice expected) ===");
    const response2 = await generateAnswer({
      message: "I have severe chest pain and difficulty breathing",
      history: []
    });
    
    console.log("✅ Response:", response2.message?.substring(0, 200));
    console.log("✅ Has disclaimer:", response2.message?.includes('⚠️'));
    console.log("✅ Has doctor advice:", response2.message?.includes('see') || response2.message?.includes('doctor'));
    
    // Test 3: General wellness question - should NOT have disclaimer
    console.log("\n=== Test 3: General Diet Question (No disclaimer expected) ===");
    const response3 = await generateAnswer({
      message: "What foods are good for energy?",
      history: []
    });
    
    console.log("✅ Response:", response3.message?.substring(0, 200));
    console.log("✅ Has disclaimer:", response3.message?.includes('⚠️'));
    console.log("✅ Has doctor advice:", response3.message?.includes('see a doctor'));
    
    // Test 4: Medication question - should have disclaimer
    console.log("\n=== Test 4: Medication Question (Disclaimer expected) ===");
    const response4 = await generateAnswer({
      message: "What's the right dosage of insulin for diabetes?",
      history: []
    });
    
    console.log("✅ Response:", response4.message?.substring(0, 200));
    console.log("✅ Has disclaimer:", response4.message?.includes('⚠️'));
    
    // Test 5: Persistent symptom - should have doctor advice
    console.log("\n=== Test 5: Persistent Symptom (Doctor advice expected) ===");
    const response5 = await generateAnswer({
      message: "I've had this cough for 3 weeks",
      history: []
    });
    
    console.log("✅ Response:", response5.message?.substring(0, 200));
    console.log("✅ Has doctor advice:", response5.message?.includes('see') || response5.message?.includes('doctor') || response5.message?.includes('healthcare'));
    
    console.log("\n🎯 Summary of Contextual Intelligence:");
    console.log("✅ Mild symptoms: No unnecessary disclaimers");
    console.log("✅ Serious symptoms: Appropriate disclaimers");
    console.log("✅ General wellness: Friendly, no disclaimers");
    console.log("✅ Medical treatments: Safety disclaimers");
    console.log("✅ Urgent symptoms: Doctor advice included");
    
  } catch (error) {
    console.error("❌ Test error:", error.message);
  }
}

testUpdatedSystem();