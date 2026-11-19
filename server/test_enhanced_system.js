import ConversationContext from './src/ConversationContext.js';
import { detectIntent, createConcisePrompt } from './src/lightweight_query.js';

// Test the enhanced system with user scenario
async function testUserScenario() {
  console.log('🧪 Testing Enhanced Context System\n');
  
  // Create a conversation context for session
  const context = new ConversationContext();
  
  console.log('=== Test 1: Shortness of Breath Conversation ===');
  
  // Simulate the exact conversation pattern user described
  const conversation = [
    { message: "I have shortness of breath", description: "Initial symptom" },
    { message: "It started 2 days ago", description: "Duration info" },
    { message: "No other symptoms", description: "User says no other symptoms" },
    { message: "no other symptoms", description: "User repeats no other symptoms" },
    { message: "ok leave this topic", description: "User wants to change topic" },
    { message: "I have a headache", description: "New topic - different symptom" }
  ];
  
  for (let i = 0; i < conversation.length; i++) {
    const { message, description } = conversation[i];
    console.log(`\n--- Step ${i + 1}: ${description} ---`);
    console.log(`User: "${message}"`);
    
    // Detect intent
    const intent = detectIntent(message, context);
    console.log(`Intent: ${intent}`);
    
    // Update context
    context.updateContext(message, intent);
    
    // Check if system should ask about other symptoms
    const hasAnsweredSymptoms = context.hasUserAnswered('other_symptoms');
    const hasAnsweredGeneral = context.hasUserAnswered('general_responses');
    
    console.log(`Has answered about other symptoms: ${hasAnsweredSymptoms}`);
    console.log(`Has answered general questions: ${hasAnsweredGeneral}`);
    
    // Show current context state
    const contextSummary = {
      entities: context.entities,
      sessionMemory: context.sessionMemory.slice(-2), // Last 2 items
      conversationFlow: context.conversationFlow.slice(-2) // Last 2 items
    };
    console.log('Context State:', JSON.stringify(contextSummary, null, 2));
    
    // If topic change, show context reset
    if (intent === 'topic_change') {
      console.log('🔄 TOPIC CHANGE DETECTED - Context should reset');
    }
  }
  
  console.log('\n=== Test 2: Context Reset Verification ===');
  
  // After topic change, verify context is clean
  const finalContext = {
    entities: context.entities,
    hasOldSymptoms: Object.keys(context.entities).includes('shortness of breath'),
    hasNewSymptoms: Object.keys(context.entities).includes('headache')
  };
  
  console.log('Final Context State:', JSON.stringify(finalContext, null, 2));
  
  console.log('\n=== Test 3: Anti-Repetition System ===');
  
  // Test that system won't ask about other symptoms again
  const testMessage = "headache for 1 hour";
  const intent = detectIntent(testMessage, context);
  console.log(`\nNew message: "${testMessage}"`);
  console.log(`Intent: ${intent}`);
  
  const shouldAskSymptoms = !context.hasUserAnswered('other_symptoms');
  console.log(`Should ask about other symptoms: ${shouldAskSymptoms}`);
  
  // Create prompt to see if it includes repetitive questions
  const prompt = createConcisePrompt(testMessage, intent, "", context);
  
  console.log('\nGenerated Prompt Preview:');
  console.log(prompt.substring(0, 500) + '...');
  
  // Check if prompt contains the anti-repetition instructions
  const hasAntiRepetition = prompt.includes('The user has already answered');
  console.log(`\nPrompt includes anti-repetition measures: ${hasAntiRepetition}`);
}

// Run the test
testUserScenario().catch(console.error);