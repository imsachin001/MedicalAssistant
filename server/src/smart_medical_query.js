// Medical Chatbot Integration - Configurable Performance
// Session-isolated instances with multiple bot options

import UltraFastMedicalBot from './UltraFastMedicalBot.js';
import SmartMedicalBot from './SmartMedicalBot.js';

// Configuration - can be changed to switch bot types
const BOT_TYPE = 'smart'; // Options: 'ultra-fast', 'smart'

// Session-specific bot instance management to prevent cross-chat contamination
const botInstances = new Map();

// Get or create a bot instance for a specific session
function getBotInstance(sessionId) {
  if (!sessionId) {
    // For sessions without ID, create a temporary instance
    return createBotInstance();
  }
  
  if (!botInstances.has(sessionId)) {
    console.log(`⚡ Creating new ${BOT_TYPE} bot instance for session: ${sessionId}`);
    botInstances.set(sessionId, createBotInstance());
  }
  
  return botInstances.get(sessionId);
}

// Create appropriate bot instance based on configuration
function createBotInstance() {
  switch (BOT_TYPE) {
    case 'smart':
      return new SmartMedicalBot();
    case 'ultra-fast':
      return new UltraFastMedicalBot();
    default:
      console.log('⚠️ Unknown bot type, defaulting to SmartMedicalBot');
      return new SmartMedicalBot();
  }
}

// Clean up old bot instances to prevent memory leaks (keep last 50 sessions)
function cleanupOldInstances() {
  if (botInstances.size > 50) {
    const entries = Array.from(botInstances.entries());
    const toDelete = entries.slice(0, entries.length - 50);
    toDelete.forEach(([sessionId]) => {
      botInstances.delete(sessionId);
      console.log(`🗑️ Cleaned up bot instance for session: ${sessionId}`);
    });
  }
}

// Main function to handle chat requests - Optimized for speed
export async function generateAnswer({ message, history = [], sessionId }, contextChunks = []) {
  const startTime = Date.now();
  
  try {
    console.log(`⚡ ${BOT_TYPE} Medical Bot processing: "${message.substring(0, 50)}..." [Session: ${sessionId || 'temp'}]`);
    
    // Get session-specific bot instance to prevent cross-chat contamination
    const medicalBot = getBotInstance(sessionId);
    
    // Process the message with our optimized fast bot
    const response = await medicalBot.processMessage(message);
    
    // Add response timing
    response.responseTime = Date.now() - startTime;
    
    // Log the conversation summary for debugging
    const summary = medicalBot.getConversationSummary();
    console.log(`📊 Session ${sessionId || 'temp'}: Turn ${summary.turnCount}, Stage: ${summary.currentStage}, Symptoms: ${summary.symptomsCount} [${response.responseTime}ms]`);
    
    // Periodic cleanup of old instances (reduced frequency)
    if (Math.random() < 0.005) { // 0.5% chance to trigger cleanup
      cleanupOldInstances();
    }
    
    return response;
    
  } catch (error) {
    console.error('Error in generateAnswer:', error);
    
    return {
      ok: false,
      type: "error",
      message: "I apologize, but I'm having trouble right now. Could you please try again? I'm here to help with your health questions.",
      responseTime: Date.now() - startTime
    };
  }
}

// Utility function for testing and debugging
export function resetBot(sessionId = null) {
  if (sessionId) {
    // Reset specific session
    const bot = botInstances.get(sessionId);
    if (bot) {
      bot.resetContext();
      console.log(`🔄 Medical bot context reset for session: ${sessionId}`);
    }
  } else {
    // Reset all sessions (for testing)
    botInstances.clear();
    console.log('🔄 All medical bot instances cleared');
  }
}

export function getBotStatus(sessionId = null) {
  const bot = getBotInstance(sessionId);
  return bot.getConversationSummary();
}

// Export bot management functions for advanced usage
export { getBotInstance, cleanupOldInstances };