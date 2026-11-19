// API Test for Smart Medical Bot
import express from 'express';
import cors from 'cors';
import { generateAnswer } from './src/smart_medical_query.js';

const app = express();
const PORT = 5001; // Use different port to avoid conflicts

app.use(cors());
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`📨 API Request: "${message}"`);
    
    const result = await generateAnswer({ message });
    
    res.json({
      success: true,
      answer: {
        message: result.message,
        type: result.type,
        context_aware: result.context_aware,
        follow_up_needed: result.follow_up_needed
      }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Smart Medical Bot API running on http://localhost:${PORT}`);
  console.log(`📱 Test with: POST http://localhost:${PORT}/api/chat`);
});

// Test the API with sample requests
async function testAPI() {
  console.log('\n🧪 Testing API endpoints...\n');
  
  const testMessages = [
    "Hello",
    "I'm having shortness of breath before sleeping",
    "It started 3 days ago and gets worse at night",
    "Should I see a doctor?"
  ];

  for (const message of testMessages) {
    try {
      const response = await fetch(`http://localhost:${PORT}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      const data = await response.json();
      
      console.log(`👤 User: ${message}`);
      console.log(`🤖 Bot (${data.answer.type}): ${data.answer.message.substring(0, 100)}...`);
      console.log(`📊 Context-aware: ${data.answer.context_aware}, Follow-up: ${data.answer.follow_up_needed}\n`);
      
    } catch (error) {
      console.error(`Error testing message "${message}":`, error.message);
    }
  }
}

// Wait a second then test
setTimeout(testAPI, 1000);