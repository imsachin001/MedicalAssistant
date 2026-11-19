// Ultra-Fast Medical Bot - Optimized for Speed and Performance
// Minimal overhead, maximum responsiveness

import { queryOllamaLight, getOllamaStatus } from './lightweight_query.js';
import ModelOptimizer from './ModelOptimizer.js';

class UltraFastMedicalBot {
  constructor() {
    this.conversationHistory = [];
    this.symptoms = new Map(); // Simplified symptom tracking
    this.turnCount = 0;
    this.lastMessage = '';
  }

  // Lightning-fast emergency check
  isEmergency(message) {
    const lowerMessage = message.toLowerCase();
    
    // Critical keywords only
    const emergencyKeywords = [
      'heart attack', 'cardiac arrest', 'crushing chest pain',
      'can\'t breathe', 'cannot breathe', 'choking',
      'unconscious', 'seizure', 'stroke', 'overdose',
      'severe bleeding', 'anaphylaxis', 'poisoning'
    ];

    return emergencyKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // Ultra-fast symptom detection
  extractSymptoms(message) {
    const lowerMessage = message.toLowerCase();
    const symptoms = [];
    
    // Simple keyword matching - no regex for speed
    const symptomMap = {
      'fever': ['fever', 'temperature', 'hot', 'feverish'],
      'headache': ['headache', 'head hurt', 'head pain'],
      'nausea': ['nausea', 'sick', 'queasy'],
      'pain': ['pain', 'hurt', 'ache'],
      'fatigue': ['tired', 'exhausted', 'energy', 'weak'],
      'cough': ['cough', 'coughing'],
      'dizziness': ['dizzy', 'lightheaded']
    };
    
    for (const [symptom, keywords] of Object.entries(symptomMap)) {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          symptoms.push(symptom);
          break;
        }
      }
    }
    
    return symptoms;
  }

  // Main processing - ultra-optimized
  async processMessage(message) {
    this.turnCount++;
    this.lastMessage = message;
    
    try {
      // 1. Emergency check first (fastest path)
      if (this.isEmergency(message)) {
        return {
          ok: true,
          type: "emergency",
          priority: "critical",
          message: "🚨 **EMERGENCY DETECTED** 🚨\n\n**Call 911 immediately** if this is a medical emergency.\n\n**Go to the nearest emergency room** or call your local emergency number.\n\nDon't wait - get professional help now!",
          model_used: 'emergency_detection'
        };
      }

      // 2. Extract symptoms (fast)
      const currentSymptoms = this.extractSymptoms(message);
      
      // 3. Update symptom tracking (minimal overhead)
      currentSymptoms.forEach(symptom => {
        this.symptoms.set(symptom, (this.symptoms.get(symptom) || 0) + 1);
      });

      // 4. Try fast AI response (with very short timeout)
      const aiResponse = await this.tryFastAI(message, currentSymptoms);
      if (aiResponse) {
        return aiResponse;
      }

      // 5. Ultra-fast fallback (always works)
      return this.getUltraFastFallback(currentSymptoms);
      
    } catch (error) {
      console.error('UltraFastBot error:', error);
      return this.getErrorResponse();
    }
  }

  // Try AI with very short timeout for speed
  async tryFastAI(message, symptoms) {
    try {
      const prompt = this.buildMinimalPrompt(message, symptoms);
      
      // Get the fastest available model
      const bestModel = await ModelOptimizer.getBestModel('speed');
      if (!bestModel) {
        return null; // No AI available, use fallback
      }
      
      // Very aggressive timeout for speed
      const aiPromise = queryOllamaLight(prompt, bestModel);
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 1500) // 1.5 second timeout for ultra-speed
      );
      
      const response = await Promise.race([aiPromise, timeout]);
      
      if (response?.response?.trim()) {
        const modelInfo = ModelOptimizer.getModelInfo(bestModel);
        return {
          ok: true,
          type: "medical_assistance",
          priority: symptoms.length > 1 ? 'medium' : 'low',
          message: response.response,
          model_used: `${bestModel}-${modelInfo.speed}`
        };
      }
      
    } catch (error) {
      // Timeout or error - fall through to fallback
      console.log(`⚡ AI timeout (${error.message}), using fallback`);
    }
    
    return null;
  }

  // Minimal prompt for speed
  buildMinimalPrompt(message, symptoms) {
    const allSymptoms = Array.from(this.symptoms.keys());
    
    return `You are a helpful medical assistant. Be brief and caring.

User message: "${message}"
Current symptoms: ${symptoms.join(', ') || 'none'}
Previous symptoms: ${allSymptoms.join(', ') || 'none'}

Respond in 2-3 sentences. Be empathetic and ask one relevant follow-up question about their symptoms.`;
  }

  // Ultra-fast fallback responses
  getUltraFastFallback(symptoms) {
    const allSymptoms = Array.from(this.symptoms.keys());
    
    let message = "I understand. ";
    
    if (symptoms.length > 0) {
      // Specific responses for common symptoms
      if (symptoms.includes('fever')) {
        message += "Fever can be your body fighting infection. How long have you had it? ";
      } else if (symptoms.includes('headache')) {
        message += "Headaches can have various causes. Is this typical for you? ";
      } else if (symptoms.includes('fatigue')) {
        message += "Feeling tired can be concerning. Has this been gradual or sudden? ";
      } else if (symptoms.includes('pain')) {
        message += "I hear you're in pain. Can you describe where and how severe? ";
      } else {
        message += `You mentioned ${symptoms.join(' and ')}. Can you tell me more? `;
      }
    } else if (allSymptoms.length > 0) {
      message += `Regarding your ${allSymptoms.join(' and ')}, how are you feeling now? `;
    } else {
      message += "I'm here to help with your health questions. What's concerning you? ";
    }

    // Add advice for multiple symptoms
    if (allSymptoms.length >= 2) {
      message += "With multiple symptoms, consider consulting a healthcare provider.";
    }

    return {
      ok: true,
      type: "medical_assistance",
      priority: allSymptoms.length > 1 ? 'medium' : 'low',
      message: message,
      model_used: 'ultra_fast_fallback'
    };
  }

  // Error response
  getErrorResponse() {
    return {
      ok: true,
      type: "error",
      message: "I'm having a brief technical issue, but I'm still here to help! Could you try asking again?",
      model_used: 'error_handler'
    };
  }

  // Reset for new sessions
  resetContext() {
    this.conversationHistory = [];
    this.symptoms.clear();
    this.turnCount = 0;
    this.lastMessage = '';
  }

  // Simple conversation summary
  getConversationSummary() {
    return {
      turnCount: this.turnCount,
      symptomsCount: this.symptoms.size,
      symptoms: Array.from(this.symptoms.keys()),
      lastMessage: this.lastMessage
    };
  }
}

export default UltraFastMedicalBot;