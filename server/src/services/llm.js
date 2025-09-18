import { OpenAI } from '@langchain/openai';
import dotenv from 'dotenv';
dotenv.config();

export async function getLLMResponse(userMessage, contextChunks) {
	const llm = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY,
		model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
		temperature: 0.2,
	});
	const context = contextChunks.join('\n');
	const prompt = `You are a helpful medical assistant. Use the following context to answer the user's question.\n\nContext:\n${context}\n\nUser: ${userMessage}\nAssistant:`;
	const response = await llm.call(prompt);
	return response;
}
