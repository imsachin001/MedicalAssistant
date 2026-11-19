// Clean Smart Medical Bot - Error-free and optimized
// Professional medical assistant with proper emergency detection

import { queryOllamaLight, getOllamaStatus } from './lightweight_query.js';
import ModelOptimizer from './ModelOptimizer.js';

class SmartMedicalBot {
  constructor() {
    this.conversationHistory = [];
    this.contextMemory = {
      symptoms: new Map(),
      timeline: [],
      userResponses: new Map(),
      medicalHistory: {
        conditions: new Set(),
        medications: new Set(),
        allergies: new Set()
      },
      currentFocus: null,
      concernLevel: 'low',
      conversationSummary: '',
      lastResponse: null,
      followUpNeeded: false
    };
    this.triageFlow = {
      stage: 'greeting',
      completedStages: new Set(),
      currentSymptom: null,
      questionsAsked: new Set(),
      triageComplete: false
    };
    this.conversationFlow = {
      turnCount: 0,
      empathyVariations: [
        "I understand", "I see", "That sounds concerning", "I hear you", 
        "Thank you for sharing that", "That makes sense", "I appreciate you telling me"
      ],
      usedPhrases: new Set()
    };
  }

  // Main message processing
  async processMessage(message) {
    this.conversationFlow.turnCount++;
    
    try {
      // Quick emergency check
      const emergencyCheck = this.performEmergencyPreScan(message);
      if (emergencyCheck.isEmergency) {
        return this.generateEmergencyResponse(emergencyCheck);
      }

      // Analyze message
      const analysis = this.analyzeMessage(message);
      
      // Update context
      this.updateContextMemory(analysis, message);
      
      // Generate response
      const response = await this.generateIntelligentResponse(analysis, message);
      
      return response;
      
    } catch (error) {
      console.error('SmartMedicalBot error:', error);
      return this.getErrorResponse();
    }
  }

  // Emergency detection
  performEmergencyPreScan(message) {
    const lowerMessage = message.toLowerCase();
    
    // Critical emergency symptoms
    const emergencySymptoms = [
      'heart attack', 'cardiac arrest', 'crushing chest pain',
      'chest pain radiating', 'can\'t breathe', 'cannot breathe',
      'choking', 'unconscious', 'seizure', 'stroke',
      'face drooping', 'speech slurred', 'severe bleeding',
      'overdose', 'poisoning', 'anaphylaxis', 'worst headache ever'
    ];

    for (const symptom of emergencySymptoms) {
      if (lowerMessage.includes(symptom)) {
        return {
          isEmergency: true,
          level: 'critical',
          reason: `Emergency detected: ${symptom}`,
          symptom: symptom
        };
      }
    }

    // Check dangerous combinations
    const hasSevereHeadache = /severe headache/.test(lowerMessage);
    const hasFever = /fever|temperature/.test(lowerMessage);
    const hasNeckPain = /neck|stiff/.test(lowerMessage);

    if (hasSevereHeadache && (hasFever || hasNeckPain)) {
      return {
        isEmergency: true,
        level: 'critical',
        reason: 'Possible meningitis: severe headache with fever or neck stiffness'
      };
    }

    const hasChestPain = /chest pain/.test(lowerMessage);
    const hasBreathing = /shortness of breath|difficulty breathing/.test(lowerMessage);
    const hasSweating = /sweating|sweats/.test(lowerMessage);

    if (hasChestPain && (hasBreathing || hasSweating)) {
      return {
        isEmergency: true,
        level: 'critical',
        reason: 'Possible cardiac emergency: chest pain with breathing difficulty or sweating'
      };
    }

    return { isEmergency: false };
  }

  // Message analysis
  analyzeMessage(message) {
    const lower = message.toLowerCase();
    
    return {
      intent: this.detectIntent(lower),
      entities: this.extractEntities(lower),
      sentiment: this.analyzeSentiment(lower),
      urgency: this.assessUrgency(lower),
      isFollowUp: this.isFollowUp(lower),
      needsDisclaimer: this.needsDisclaimer(lower)
    };
  }

  // Intent detection
  detectIntent(message) {
    if (/\b(feel|feeling|have|having|experiencing|symptoms?|pain|ache|hurt)\b/.test(message)) {
      return 'symptom_report';
    }
    
    if (/\b(what|how|why|when|where|can you|tell me|explain)\b/.test(message)) {
      return 'information_request';
    }
    
    if (/\b(treat|treatment|help|advice|recommend|should i|what do)\b/.test(message)) {
      return 'advice_request';
    }
    
    if (/^(hi|hello|hey|good morning|good afternoon)/.test(message.trim())) {
      return 'greeting';
    }
    
    return 'general_inquiry';
  }

  // Extract medical entities
  extractEntities(message) {
    const entities = {
      symptoms: [],
      severity: null,
      duration: null,
      bodyParts: []
    };

    // Symptom patterns
    const symptomPatterns = {
      'headache': /\b(headache|migraine|head pain)\b/g,
      'chest pain': /\b(chest pain|heart pain|cardiac)\b/g,
      'fever': /\b(fever|temperature|chills|hot|cold)\b/g,
      'nausea': /\b(nausea|vomiting|sick|throw up|queasy)\b/g,
      'fatigue': /\b(tired|exhausted|fatigue|weakness|energy)\b/g,
      'dizziness': /\b(dizzy|lightheaded|spinning|vertigo)\b/g,
      'cough': /\b(cough|coughing)\b/g,
      'pain': /\b(pain|ache|hurt|sore|tender)\b/g
    };

    for (const [symptom, pattern] of Object.entries(symptomPatterns)) {
      if (pattern.test(message)) {
        entities.symptoms.push(symptom);
      }
    }

    // Severity
    if (/\b(severe|extreme|unbearable|worst|terrible)\b/.test(message)) {
      entities.severity = 'severe';
    } else if (/\b(moderate|pretty bad|quite bad)\b/.test(message)) {
      entities.severity = 'moderate';
    } else if (/\b(mild|slight|little)\b/.test(message)) {
      entities.severity = 'mild';
    }

    // Duration
    const durationMatch = message.match(/(\d+)\s*(minutes?|hours?|days?|weeks?|months?)/i);
    if (durationMatch) {
      entities.duration = `${durationMatch[1]} ${durationMatch[2]}`;
    }

    return entities;
  }

  // Assess urgency
  assessUrgency(message) {
    if (/\b(emergency|911|help|dying|can't breathe)\b/.test(message)) {
      return 'critical';
    }
    
    if (/\b(severe|intense|unbearable|worsening|getting worse)\b/.test(message)) {
      return 'high';
    }
    
    if (/\b(concerned|worried|persistent|ongoing)\b/.test(message)) {
      return 'medium';
    }
    
    return 'low';
  }

  // Check if follow-up
  isFollowUp(message) {
    if (this.conversationFlow.turnCount <= 1) return false;
    
    const followUpPatterns = /\b(yes|no|maybe|sometimes|it|that|this|also|and|but)\b/;
    return followUpPatterns.test(message);
  }

  // Check if needs disclaimer
  needsDisclaimer(message) {
    return /\b(treatment|medication|diagnosis|disease|condition|medical)\b/.test(message);
  }

  // Analyze sentiment
  analyzeSentiment(message) {
    if (/\b(worried|scared|anxious|concerned|afraid|panic)\b/.test(message)) {
      return 'worried';
    }
    if (/\b(frustrated|annoyed|tired of|fed up)\b/.test(message)) {
      return 'frustrated';
    }
    if (/\b(better|improving|hoping|optimistic)\b/.test(message)) {
      return 'hopeful';
    }
    return 'neutral';
  }

  // Update context memory
  updateContextMemory(analysis, message) {
    // Add symptoms
    analysis.entities.symptoms.forEach(symptom => {
      if (!this.contextMemory.symptoms.has(symptom)) {
        this.contextMemory.symptoms.set(symptom, {
          firstMentioned: this.conversationFlow.turnCount,
          severity: analysis.entities.severity,
          duration: analysis.entities.duration,
          count: 1
        });
      } else {
        const existing = this.contextMemory.symptoms.get(symptom);
        existing.count++;
        if (analysis.entities.severity) {
          existing.severity = analysis.entities.severity;
        }
      }
    });

    // Add to timeline
    this.contextMemory.timeline.push({
      turn: this.conversationFlow.turnCount,
      message: message,
      analysis: analysis,
      timestamp: new Date()
    });

    // Keep only last 10 entries for performance
    if (this.contextMemory.timeline.length > 10) {
      this.contextMemory.timeline = this.contextMemory.timeline.slice(-10);
    }

    // Update concern level
    this.updateConcernLevel(analysis);
  }

  // Update concern level
  updateConcernLevel(analysis) {
    let score = 0;
    
    if (analysis.urgency === 'critical') score += 10;
    else if (analysis.urgency === 'high') score += 5;
    else if (analysis.urgency === 'medium') score += 2;
    
    if (this.contextMemory.symptoms.size > 2) score += 3;
    if (analysis.entities.severity === 'severe') score += 4;
    
    if (score >= 8) this.contextMemory.concernLevel = 'high';
    else if (score >= 4) this.contextMemory.concernLevel = 'medium';
    else this.contextMemory.concernLevel = 'low';
  }

  // Generate intelligent response
  async generateIntelligentResponse(analysis, originalMessage) {
    try {
      // Build context
      const context = this.buildContextualPrompt(analysis, originalMessage);
      
      // Get best model
      const model = await ModelOptimizer.getBestModel('quality');
      
      if (model) {
        // Try AI response with timeout
        const aiPromise = queryOllamaLight(context, model);
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 30000)
        );
        
        try {
          const aiResponse = await Promise.race([aiPromise, timeout]);
          
          if (aiResponse?.response?.trim()) {
            return {
              ok: true,
              type: "medical_assistance",
              priority: analysis.urgency,
              message: aiResponse.response,
              model_used: model
            };
          }
        } catch (timeoutError) {
          console.log('⏱️ AI timeout, using fallback');
        }
      }
      
      // Fallback response
      return this.generateFallbackResponse(analysis, originalMessage);
      
    } catch (error) {
      console.error('Response generation error:', error);
      return this.generateFallbackResponse(analysis, originalMessage);
    }
  }

  // Build contextual prompt
  buildContextualPrompt(analysis, message) {
    const symptoms = Array.from(this.contextMemory.symptoms.keys());
    const recentHistory = this.contextMemory.timeline.slice(-3)
      .map(t => t.message).join('\n');
    
    const disclaimer = analysis.needsDisclaimer ? 
      "Remember to include appropriate medical disclaimers. " : "";
    
    return `You are a caring medical AI assistant. ${disclaimer}

Recent conversation:
${recentHistory}

Current message: "${message}"
Patient symptoms: ${symptoms.join(', ') || 'none mentioned'}
Urgency level: ${analysis.urgency}
Concern level: ${this.contextMemory.concernLevel}

Instructions:
- Be empathetic and professional
- Ask relevant follow-up questions about symptoms
- Provide helpful medical information when appropriate
- Recommend seeking healthcare if concerning patterns emerge
- Keep responses concise (2-3 sentences)

Respond naturally and helpfully:`;
  }

  // Generate fallback response
  generateFallbackResponse(analysis, message) {
    const empathy = this.getVariedEmpathy();
    const symptoms = Array.from(this.contextMemory.symptoms.keys());
    
    let response = `${empathy}. `;
    
    if (analysis.intent === 'symptom_report') {
      if (symptoms.length > 0) {
        response += `I understand you're experiencing ${symptoms.join(' and ')}. `;
        if (this.contextMemory.concernLevel === 'high') {
          response += `With these symptoms, I'd recommend consulting a healthcare provider for proper evaluation. `;
        }
        response += `Can you tell me more about when these symptoms started?`;
      } else {
        response += `I'd like to help you with your health concerns. Can you describe what symptoms you're experiencing?`;
      }
    } else if (analysis.intent === 'advice_request') {
      if (symptoms.length > 0) {
        response += `For ${symptoms.join(' and ')}, I recommend staying hydrated, getting rest, and monitoring your symptoms. `;
        response += `If symptoms persist or worsen, please consult a healthcare provider.`;
      } else {
        response += `I'm happy to provide general health guidance. What specific area would you like advice about?`;
      }
    } else {
      response += `I'm here to help with your health questions. Feel free to share any symptoms or health concerns you have.`;
    }

    const disclaimer = analysis.needsDisclaimer ? 
      "\n\n*Please note: This is general health information only. For medical advice, consult healthcare professionals.*" : "";

    return {
      ok: true,
      type: "medical_assistance",
      priority: analysis.urgency,
      message: response + disclaimer,
      model_used: 'structured_fallback'
    };
  }

  // Generate emergency response
  generateEmergencyResponse(emergencySignal) {
    return {
      ok: true,
      type: "emergency",
      priority: "critical",
      message: `🚨 **MEDICAL EMERGENCY DETECTED** 🚨\n\n**${emergencySignal.reason}**\n\n**IMMEDIATE ACTION REQUIRED:**\n• **Call 911 now**\n• **Go to the nearest emergency room**\n• **Don't wait or delay**\n\nThis appears to be a serious medical emergency that requires immediate professional medical attention.`,
      model_used: 'emergency_detection',
      emergency_level: emergencySignal.level
    };
  }

  // Get varied empathy
  getVariedEmpathy() {
    const available = this.conversationFlow.empathyVariations.filter(
      phrase => !this.conversationFlow.usedPhrases.has(phrase)
    );
    
    if (available.length === 0) {
      this.conversationFlow.usedPhrases.clear();
      return this.conversationFlow.empathyVariations[0];
    }
    
    const chosen = available[Math.floor(Math.random() * available.length)];
    this.conversationFlow.usedPhrases.add(chosen);
    return chosen;
  }

  // Error response
  getErrorResponse() {
    return {
      ok: true,
      type: "error",
      message: "I apologize, but I encountered a technical issue. Please try rephrasing your question, and I'll do my best to help with your health concerns.",
      model_used: 'error_handler'
    };
  }

  // Reset context
  resetContext() {
    this.conversationHistory = [];
    this.contextMemory = {
      symptoms: new Map(),
      timeline: [],
      userResponses: new Map(),
      medicalHistory: {
        conditions: new Set(),
        medications: new Set(),
        allergies: new Set()
      },
      currentFocus: null,
      concernLevel: 'low',
      conversationSummary: '',
      lastResponse: null,
      followUpNeeded: false
    };
    this.triageFlow = {
      stage: 'greeting',
      completedStages: new Set(),
      currentSymptom: null,
      questionsAsked: new Set(),
      triageComplete: false
    };
    this.conversationFlow.turnCount = 0;
    this.conversationFlow.usedPhrases.clear();
  }

  // Get conversation summary
  getConversationSummary() {
    return {
      turnCount: this.conversationFlow.turnCount,
      currentStage: this.triageFlow.stage,
      completedStages: Array.from(this.triageFlow.completedStages),
      symptoms: Array.from(this.contextMemory.symptoms.keys()),
      concernLevel: this.contextMemory.concernLevel,
      conversationSummary: this.contextMemory.conversationSummary,
      triageComplete: this.triageFlow.triageComplete
    };
  }
}

export default SmartMedicalBot;