// Fast Smart Medical Chatbot - Optimized for Performance
// Context-aware medical assistance with minimal latency

import { queryOllamaLight, getOllamaStatus } from './lightweight_query.js';

class FastSmartMedicalBot {
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

  // Fast emergency detection with essential keywords only
  quickEmergencyCheck(message) {
    const lowerMessage = message.toLowerCase();
    
    // Critical emergency patterns that require immediate 911
    const emergencyPatterns = [
      'heart attack', 'cardiac arrest', 'crushing chest pain',
      'can\'t breathe', 'cannot breathe', 'choking',
      'unconscious', 'seizure', 'stroke',
      'severe bleeding', 'overdose', 'poisoning',
      'anaphylaxis', 'worst headache ever',
      'speech slurred', 'face drooping'
    ];

    for (const pattern of emergencyPatterns) {
      if (lowerMessage.includes(pattern)) {
        return {
          isEmergency: true,
          urgency: 'critical',
          reason: `Emergency detected: ${pattern}. Seek immediate medical attention.`
        };
      }
    }

    return { isEmergency: false };
  }

  // Streamlined message processing
  async processMessage(message) {
    this.conversationFlow.turnCount++;
    
    try {
      // Quick emergency check first
      const emergencyCheck = this.quickEmergencyCheck(message);
      if (emergencyCheck.isEmergency) {
        return {
          ok: true,
          type: "emergency",
          priority: "critical",
          message: `🚨 **EMERGENCY DETECTED** 🚨\n\n${emergencyCheck.reason}\n\n**Please call 911 or go to the emergency room immediately.**\n\nIf this is a life-threatening emergency, don't wait - call emergency services now.`,
          model_used: 'emergency_detection',
          escalationType: 'emergency'
        };
      }

      // Fast analysis without heavy processing
      const analysis = this.fastAnalyze(message);
      
      // Update context efficiently
      this.updateContext(analysis, message);
      
      // Generate response
      const response = await this.generateResponse(analysis, message);
      
      return response;
      
    } catch (error) {
      console.error('FastSmartMedicalBot error:', error);
      return {
        ok: true,
        type: "error",
        message: "I apologize, but I'm having trouble processing your message right now. Could you please try again?",
        model_used: 'error_handler'
      };
    }
  }

  // Enhanced fast analysis with better symptom detection
  fastAnalyze(message) {
    const lower = message.toLowerCase();
    
    // Enhanced symptom detection with more terms
    const symptoms = [];
    const symptomPatterns = {
      'fever': ['fever', 'temperature', 'hot', 'burning up', 'feverish'],
      'fatigue': ['tired', 'exhausted', 'low energy', 'energy', 'fatigue', 'weak', 'weakness'],
      'headache': ['headache', 'head hurt', 'head pain', 'migraine'],
      'nausea': ['nausea', 'nauseous', 'sick to stomach', 'queasy'],
      'pain': ['pain', 'hurt', 'ache', 'aching', 'sore'],
      'cough': ['cough', 'coughing'],
      'breathing': ['breath', 'breathing', 'shortness of breath'],
      'dizziness': ['dizzy', 'lightheaded', 'spinning']
    };
    
    // Check for symptom patterns
    for (const [symptom, patterns] of Object.entries(symptomPatterns)) {
      for (const pattern of patterns) {
        if (lower.includes(pattern)) {
          if (!symptoms.includes(symptom)) {
            symptoms.push(symptom);
          }
          break;
        }
      }
    }

    // Simple intent detection
    let intent = 'symptom_description';
    if (lower.includes('help') || lower.includes('advice') || lower.includes('what should')) {
      intent = 'seeking_help';
    } else if (lower.includes('thank') || lower.includes('okay') || lower.includes('thanks')) {
      intent = 'acknowledgment';
    } else if (lower.includes('how') && lower.includes('work')) {
      intent = 'question_about_system';
    }

    return {
      intent,
      symptoms,
      urgency: symptoms.length > 2 ? 'medium' : 'low',
      needsFollowUp: symptoms.length > 0
    };
  }

  // Efficient context update
  updateContext(analysis, message) {
    // Add to timeline
    this.contextMemory.timeline.push({
      turn: this.conversationFlow.turnCount,
      message: message,
      timestamp: new Date()
    });

    // Keep only last 5 messages for performance
    if (this.contextMemory.timeline.length > 5) {
      this.contextMemory.timeline = this.contextMemory.timeline.slice(-5);
    }

    // Update symptoms
    analysis.symptoms.forEach(symptom => {
      this.contextMemory.symptoms.set(symptom, {
        firstMentioned: this.conversationFlow.turnCount,
        count: (this.contextMemory.symptoms.get(symptom)?.count || 0) + 1
      });
    });
  }

  // Fast response generation with timeout and fallback
  async generateResponse(analysis, originalMessage) {
    try {
      // Build context for AI
      const context = this.buildFastContext(analysis, originalMessage);
      
      // Try AI with timeout for speed
      console.log(`⚡ Quick AI query for symptoms: ${analysis.symptoms.join(', ') || 'none'}`);
      
      const aiResponsePromise = queryOllamaLight(context.prompt, 'gemma3:1b');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI timeout')), 3000) // 3 second timeout
      );
      
      try {
        const aiResponse = await Promise.race([aiResponsePromise, timeoutPromise]);
        
        if (aiResponse && aiResponse.response && aiResponse.response.trim()) {
          console.log(`✅ Fast AI response received`);
          return {
            ok: true,
            type: "medical_assistance",
            priority: analysis.urgency,
            message: aiResponse.response,
            model_used: 'gemma3:1b',
            context_count: context.contextItems
          };
        }
      } catch (timeoutError) {
        console.log(`⏱️ AI timeout after 3s, using intelligent fallback`);
      }
      
      // Fast intelligent fallback
      return this.getFallbackResponse(analysis);
      
    } catch (error) {
      console.error('Response generation error:', error);
      return this.getFallbackResponse(analysis);
    }
  }

  // Fast context building with better symptom tracking
  buildFastContext(analysis, message) {
    const recentMessages = this.contextMemory.timeline.slice(-3)
      .map(t => t.message).join('\n');
    
    const allSymptoms = Array.from(this.contextMemory.symptoms.keys());
    const currentSymptoms = analysis.symptoms;
    
    const prompt = `You are a compassionate medical assistant. 

Recent conversation:
${recentMessages}

Current message: ${message}

Symptoms mentioned so far: ${allSymptoms.length > 0 ? allSymptoms.join(', ') : 'none'}
New symptoms in this message: ${currentSymptoms.length > 0 ? currentSymptoms.join(', ') : 'none'}

Guidelines:
- Be empathetic and understanding
- Ask relevant follow-up questions about symptoms (duration, severity, triggers)
- If multiple concerning symptoms, recommend seeing a healthcare provider
- Provide helpful general information when appropriate
- Keep response conversational and supportive

Provide a helpful, caring response:`;

    return {
      prompt,
      contextItems: this.contextMemory.timeline.length
    };
  }

  // Intelligent fallback response with symptom awareness
  getFallbackResponse(analysis) {
    const empathy = this.conversationFlow.empathyVariations[
      Math.floor(Math.random() * this.conversationFlow.empathyVariations.length)
    ];

    // Get all symptoms mentioned in conversation
    const allSymptoms = Array.from(this.contextMemory.symptoms.keys());
    const currentSymptoms = analysis.symptoms;

    let message = `${empathy}. `;
    
    // Handle different scenarios
    if (analysis.intent === 'question_about_system') {
      message = `I'm a medical assistant designed to help you understand your symptoms and provide guidance. `;
      message += `I try to ask relevant questions about your symptoms and suggest when you might want to see a healthcare provider. `;
      message += `I'm currently experiencing some technical issues with my AI processing, but I'm still here to help! `;
      
      if (allSymptoms.length > 0) {
        message += `\n\nRegarding your symptoms (${allSymptoms.join(', ')}), `;
        
        // Provide specific advice based on symptoms
        if (allSymptoms.includes('fever') && allSymptoms.includes('fatigue')) {
          message += `fever combined with fatigue could indicate an infection. How long have you been experiencing these symptoms?`;
        } else if (allSymptoms.includes('fever')) {
          message += `how high is your fever and how long have you had it?`;
        } else if (allSymptoms.includes('fatigue')) {
          message += `fatigue can have many causes. Has this been gradual or sudden?`;
        } else {
          message += `can you tell me more about when these started and how severe they are?`;
        }
      }
    } else if (currentSymptoms.length > 0 || allSymptoms.length > 0) {
      const symptomsToMention = currentSymptoms.length > 0 ? currentSymptoms : allSymptoms;
      
      if (symptomsToMention.includes('fever') && symptomsToMention.includes('fatigue')) {
        message += `Fever and fatigue together often suggest your body is fighting an infection. `;
        message += `Can you tell me how long you've had these symptoms and how high your fever has been?`;
      } else if (symptomsToMention.includes('fever')) {
        message += `I understand you have a fever. This is your body's way of fighting infection. `;
        message += `How long have you had the fever, and do you know what your temperature is?`;
      } else if (symptomsToMention.includes('fatigue')) {
        message += `Low energy can be concerning, especially when combined with other symptoms. `;
        message += `How long have you been feeling this way, and is it affecting your daily activities?`;
      } else {
        message += `I hear that you're experiencing ${symptomsToMention.join(' and ')}. `;
        message += `Can you tell me more about when these symptoms started?`;
      }
      
      // Add advice for multiple symptoms
      if (allSymptoms.length >= 2) {
        message += ` \n\nWith multiple symptoms, it would be wise to consult with a healthcare provider for proper evaluation.`;
      }
    } else {
      message += `I'm here to help with any health questions you might have. `;
      message += `Feel free to tell me about any symptoms you're experiencing.`;
    }

    return {
      ok: true,
      type: "medical_assistance",
      priority: analysis.urgency,
      message: message,
      model_used: 'intelligent_fallback'
    };
  }

  // Reset context for new sessions
  resetContext() {
    this.conversationHistory = [];
    this.contextMemory = {
      symptoms: new Map(),
      timeline: [],
      userResponses: new Map(),
      medicalHistory: { conditions: new Set(), medications: new Set(), allergies: new Set() },
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
      followUpNeeded: this.contextMemory.followUpNeeded,
      symptomsCount: this.contextMemory.symptoms.size,
      concernLevel: this.contextMemory.concernLevel
    };
  }
}

export default FastSmartMedicalBot;