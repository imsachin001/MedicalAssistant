import { getRelevantChunks as getChunks, generateAnswer } from '../query.js';

export async function getRelevantChunks(question) {
  // Use the same logic as getRelevantChunks in query.js
  const result = await getChunks(question);
  return result.matches || [];
}

// Accepts { message, history } for context-aware answers
export async function getLLMResponse({ message, history }, contextChunks) {
  return await generateAnswer({ message, history }, contextChunks);
}
