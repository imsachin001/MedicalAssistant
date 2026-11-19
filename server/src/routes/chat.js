// chat.js (Express router)
import express from "express";
import ChatSession from "../models/ChatSession.js";
import { requireAuth } from "../middleware/auth.js";
import {
  generateAnswer,
  getRelevantChunks,
  generateFallback,
  detectIntent
} from "../lightweight_query.js";

const router = express.Router();
router.use(requireAuth);

// Health check and debug route for GET /api/chat
router.get('/', (req, res) => {
  res.json({ message: 'Chat API is working. Use POST to send messages.' });
});

// Get all chat sessions
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user.sub }).sort({ updatedAt: -1 });
    res.json(sessions);
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific chat session by ID
router.get('/sessions/:id', async (req, res) => {
  try {
    const session = await ChatSession.findOne({ _id: req.params.id, userId: req.user.sub });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (err) {
    console.error('Error fetching session:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper: detect common general followup patterns (we treat them as conversational)
function isGeneralFollowup(msg = "") {
  const lower = (msg || "").toLowerCase();
  return /^(are these|is this|is that|is it|can i|should i|do i|does this|is everything|is the above|is this correct|is that correct|is it correct|is this true|is that true)/.test(lower);
}

// Extract Q/A pairs from context chunks for direct matching (if you keep Q/A text inside pdfs)
function extractQA(contextChunks = [], userMessage = "") {
  const qLower = (userMessage || "").trim().toLowerCase();
  const qPattern = /Q\d+:\s*(.+?)\s*A\d+:\s*(.+?)(?=\s*Q\d+:|$)/gis;
  for (const chunk of contextChunks) {
    const text = chunk.metadata && chunk.metadata.text ? chunk.metadata.text : "";
    let match;
    while ((match = qPattern.exec(text)) !== null) {
      const q = (match[1] || "").trim().toLowerCase();
      const a = (match[2] || "").trim();
      if (q === qLower) return a;
    }
  }
  return null;
}

router.post("/", async (req, res) => {
  const { message, history = [], sessionId, name } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    console.log(`📨 New chat request: "${message.substring(0, 50)}..."`);
    
    // 1) Build retrieval query (use recent history + current)
    let retrievalQuery = message;
    if (Array.isArray(history) && history.length > 0) {
      const recent = history.slice(-4).map(m => 
        `${m.role === "user" ? "User" : "Assistant"}: ${typeof m.text === "string" ? m.text : JSON.stringify(m.text)}`
      ).join("\n");
      retrievalQuery = recent + "\nUser: " + message;
    }

    // 2) Determine intent and get relevant context
    const intent = detectIntent(message);
    console.log(`🎯 Intent: ${intent}`);
    
    const { matches: contextChunks, maxScore } = await getRelevantChunks(retrievalQuery, intent, 10);
    console.log(`📚 Found ${contextChunks.length} context chunks, max score: ${maxScore.toFixed(3)}`);

    // 3) Generate enhanced medical response
    const medicalResult = await generateAnswer({ message, history, sessionId }, contextChunks);
    
    let assistantResponse;
    let responseMessage;

    if (medicalResult.ok) {
      // Success case
      responseMessage = medicalResult.message;
      assistantResponse = {
        message: medicalResult.message,
        model_used: medicalResult.model_used,
        context_count: medicalResult.context_count,
        type: medicalResult.type,
        priority: medicalResult.priority || "normal"
      };
      
      console.log(`✅ Response generated using ${medicalResult.model_used || 'unknown model'}`);
    } else {
      // Fallback case
      console.log(`⚠️ Medical model failed (${medicalResult.reason}), using fallback...`);
      
      const fallbackResult = await generateFallback({ message, history });
      responseMessage = fallbackResult.message;
      assistantResponse = {
        message: fallbackResult.message,
        type: "fallback",
        fallback_reason: medicalResult.reason
      };
    }

    // 4) Save to database
    let chatSession = null;
    if (sessionId) {
      chatSession = await ChatSession.findOne({ _id: sessionId, userId: req.user.sub });
    }
    
    if (!chatSession) {
      const sessionName = name || message.substring(0, 50) + (message.length > 50 ? "..." : "");
      chatSession = new ChatSession({ 
        userId: req.user.sub,
        name: sessionName, 
        messages: [] 
      });
    }

    // Add messages to session
    chatSession.messages.push({ role: "user", text: message });
    chatSession.messages.push({ role: "assistant", text: responseMessage });
    chatSession.updatedAt = new Date();
    
    await chatSession.save();

    console.log(`💾 Saved to session: ${chatSession._id}`);

    // 5) Return response
    return res.json({ 
      answer: assistantResponse,
      sessionId: chatSession._id,
      intent: intent,
      context_count: contextChunks.length
    });

  } catch (err) {
    console.error("❌ Chat error:", err);
    return res.status(500).json({ 
      error: "I encountered an error processing your request. Please try again.",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

export default router;
