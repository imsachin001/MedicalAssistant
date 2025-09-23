
import express from 'express';
import { getRelevantChunks, getLLMResponse } from '../services/vectorStore.js';

const router = express.Router();

// POST /api/chat { message: string, history?: [{role, text}] }
router.post('/', async (req, res) => {
	const { message, history } = req.body;
	if (!message) return res.status(400).json({ error: 'Message is required' });
	try {
		// 0. Check for general follow-up/confirmation question
		function isGeneralFollowup(msg) {
			const lower = msg.toLowerCase();
			return /^(are these|is this|is that|is it|can i|should i|do i|does this|is everything|is the above|is the following|are the above|are the following|is that correct|is this correct|is it correct|is this true|is that true|is it true|is this good|is that good|are these good|are those good|is this safe|is that safe|are these safe|are those safe|is this recommended|is that recommended|are these recommended|are those recommended)/.test(lower);
		}

		// 1. Concatenate recent history for retrieval (user+assistant turns)
		let retrievalQuery = message;
		if (Array.isArray(history) && history.length > 0) {
			// Use last 3 turns (user+assistant) for context
			const recent = history.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
			retrievalQuery = recent + '\n' + 'User: ' + message;
		}
		// 2. Retrieve relevant context from Pinecone
		const contextChunks = await getRelevantChunks(retrievalQuery);


			// 2.5. Q&A extractor for direct context answers (for greetings, common Q&A)
			function extractQA(contextChunks, userMessage) {
				const qPattern = /Q\d+:\s*(.+?)\s*A\d+:\s*(.+?)(?=\s*Q\d+:|$)/gs;
				for (const chunk of contextChunks) {
					const text = chunk.metadata && chunk.metadata.text ? chunk.metadata.text : '';
					let match;
					while ((match = qPattern.exec(text)) !== null) {
						const q = match[1].trim().toLowerCase();
						const a = match[2].trim();
						if (userMessage.trim().toLowerCase() === q) {
							return a;
						}
					}
				}
				return null;
			}
			const directAnswer = extractQA(contextChunks, message);
			if (directAnswer) {
				return res.json({ answer: { message: directAnswer } });
			}

			// If no relevant context chunks (all empty or irrelevant), reply with fallback
			const allTexts = contextChunks.map(c => (c.metadata && c.metadata.text ? c.metadata.text.trim() : '')).join(' ').toLowerCase();
			const isGreeting = /^(hi|hello|hlo|hey|good morning|good evening|good afternoon|how are you|what's up|thank you|thanks|okay|alright|yes|no)$/.test(message.trim().toLowerCase());
			if ((!allTexts || allTexts === '') || (isGreeting && !directAnswer)) {
				return res.json({ answer: { message: "Sorry, I did not find any relevant information for your query. Please ask a specific question or try again." } });
			}

		// 3. Check for general follow-up/confirmation question (after Q&A extractor)
		if (isGeneralFollowup(message) && Array.isArray(history) && history.length > 0) {
			// Find last assistant message with a structured object
			const lastAssistant = [...history].reverse().find(m => m.role === 'assistant' && typeof m.text === 'object');
			if (lastAssistant && lastAssistant.text) {
				// If the last assistant message has a non-empty section, reply instantly
				const keys = Object.keys(lastAssistant.text).filter(k => Array.isArray(lastAssistant.text[k]) && lastAssistant.text[k].length > 0);
				if (keys.length > 0) {
					// Simple logic: if previous answer had content, say Yes
					return res.json({ answer: { message: 'Yes, these are recommended based on the previous information provided.' } });
				}
			}
		}

		// 4. Pass history to LLM for context-aware answer
		const answer = await getLLMResponse({ message, history }, contextChunks);
		res.json({ answer });
	} catch (err) {
		console.error('Chatbot error:', err);
		res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
