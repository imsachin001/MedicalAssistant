import { queryPinecone, generateAnswer } from '../query.js';

export async function getRelevantChunks(question) {
  // Use the same logic as queryPinecone in query.js
  return (await queryPinecone(question)).matches || [];
}

// Accepts { message, history } for context-aware answers
export async function getLLMResponse({ message, history }, contextChunks) {
  return await generateAnswer({ message, history }, contextChunks);
}
