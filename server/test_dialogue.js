// Test script to debug the dialogue state system
import { generateAnswer, detectIntent } from './src/lightweight_query.js';

console.log('Testing dialogue state system...');

// Test 1: Intent detection
const testMessage = "i am feeling shortness of breath before sleeping";
console.log(`\nTest message: "${testMessage}"`);

const intent = detectIntent(testMessage);
console.log(`Detected intent: ${intent}`);

// Test 2: Generate answer
try {
  const result = await generateAnswer({ message: testMessage });
  console.log(`\nResult type: ${result.type}`);
  console.log(`Full message:\n${result.message}`);
} catch (error) {
  console.error('Error:', error.message);
}