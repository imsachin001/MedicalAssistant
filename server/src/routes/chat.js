import express from 'express';
import { getRelevantChunks } from '../services/vectorStore.js';
import { getLLMResponse } from '../services/llm.js';

const router = express.Router();

// POST /api/chat { message: string }
router.post('/', async (req, res) => {
	const { message } = req.body;
	if (!message) return res.status(400).json({ error: 'Message is required' });
	try {
		// 1. Retrieve relevant context from Pinecone
		const contextChunks = await getRelevantChunks(message);
		// 2. Get LLM response
		const answer = await getLLMResponse(message, contextChunks);
		res.json({ answer });
	} catch (err) {
		console.error('Chatbot error:', err);
		res.status(500).json({ error: 'Internal server error' });
	}
});

export default router;
