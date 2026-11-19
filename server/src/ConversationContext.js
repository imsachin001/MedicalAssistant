// Enhanced context management system for medical AI chatbot
// Tracks entities, conversation history, and provides intelligent context awareness

class ConversationContext {
  constructor() {
    this.entities = {
      symptoms: new Set(),
      conditions: new Set(), 
      medications: new Set(),
      body_parts: new Set(),
      treatments: new Set()
    };
    this.history = [];
    this.lastTopics = [];
    this.sessionSummary = "";
    this.lastUserQuery = "";
    this.lastBotResponse = "";
  }

  // Extract medical entities from text
  extractEntities(text) {
    const lower = text.toLowerCase();
    const extracted = {
      symptoms: [],
      conditions: [],
      medications: [],
      body_parts: [],
      treatments: []
    };

    // Symptoms extraction
    const symptomPatterns = [
      /\b(headache|migraine|pain|ache|hurt|sore|fever|cough|nausea|dizzy|tired|fatigue|swelling|rash|itch|bump|lump|bleeding|numbness|tingling|shortness of breath|breathing|chest pain|back pain|stomach pain|joint pain|muscle pain|neck pain)\b/g,
      /\b(feel|feeling|experiencing|having|suffer|suffering)\s+(.*?)\b/g
    ];

    // Conditions extraction  
    const conditionPatterns = [
      /\b(diabetes|hypertension|asthma|cancer|arthritis|depression|anxiety|copd|pneumonia|bronchitis|flu|cold|covid|infection|allergy|allergies)\b/g
    ];

    // Medications extraction
    const medicationPatterns = [
      /\b(ibuprofen|acetaminophen|aspirin|insulin|metformin|lisinopril|atorvastatin|omeprazole|albuterol|prednisone|antibiotics|painkillers|pain relievers)\b/g
    ];

    // Body parts extraction
    const bodyPartPatterns = [
      /\b(head|neck|chest|back|stomach|abdomen|arm|leg|knee|ankle|shoulder|wrist|hand|foot|throat|lungs|heart|liver|kidney|brain)\b/g
    ];

    // Treatments extraction
    const treatmentPatterns = [
      /\b(rest|ice|heat|massage|exercise|surgery|therapy|medication|treatment|home remedy|stretching)\b/g
    ];

    // Extract all entities
    const patterns = {
      symptoms: symptomPatterns,
      conditions: conditionPatterns,
      medications: medicationPatterns,
      body_parts: bodyPartPatterns,
      treatments: treatmentPatterns
    };

    for (const [category, patternList] of Object.entries(patterns)) {
      for (const pattern of patternList) {
        const matches = lower.match(pattern);
        if (matches) {
          extracted[category].push(...matches);
        }
      }
    }

    return extracted;
  }

  // Update context with new user message
  updateContext(userMessage, botResponse) {
    // Extract entities from user message
    const entities = this.extractEntities(userMessage);
    
    // Add new entities to session
    for (const [category, items] of Object.entries(entities)) {
      for (const item of items) {
        this.entities[category].add(item.trim());
      }
    }

    // Update conversation history (keep last 5 exchanges)
    this.history.push({
      user: userMessage,
      assistant: botResponse,
      timestamp: new Date(),
      entities: entities
    });

    if (this.history.length > 5) {
      this.history.shift(); // Remove oldest
    }

    // Update session summary
    this.generateSessionSummary();
    
    // Store last interaction
    this.lastUserQuery = userMessage;
    this.lastBotResponse = botResponse;
  }

  // Generate contextual summary
  generateSessionSummary() {
    const allSymptoms = Array.from(this.entities.symptoms);
    const allConditions = Array.from(this.entities.conditions);
    const allMedications = Array.from(this.entities.medications);

    let summary = "";
    
    if (allSymptoms.length > 0) {
      summary += `User experiencing: ${allSymptoms.slice(0, 3).join(", ")}. `;
    }
    
    if (allConditions.length > 0) {
      summary += `Conditions mentioned: ${allConditions.slice(0, 2).join(", ")}. `;
    }
    
    if (allMedications.length > 0) {
      summary += `Medications discussed: ${allMedications.slice(0, 2).join(", ")}. `;
    }

    // Add recent topic context
    if (this.history.length > 0) {
      const lastExchange = this.history[this.history.length - 1];
      summary += `Last discussed: ${this.categorizeQuery(lastExchange.user)}.`;
    }

    this.sessionSummary = summary.trim();
  }

  // Categorize the type of query
  categorizeQuery(query) {
    const lower = query.toLowerCase();
    
    if (/\b(symptom|sign|feel|experiencing|pain|ache|hurt)\b/.test(lower)) {
      return "symptoms";
    } else if (/\b(treat|treatment|therapy|medicine|medication|cure|heal)\b/.test(lower)) {
      return "treatments";
    } else if (/\b(cause|reason|why|what makes|trigger)\b/.test(lower)) {
      return "causes";
    } else if (/\b(prevent|prevention|avoid|stop|reduce risk)\b/.test(lower)) {
      return "prevention";
    } else if (/\b(food|diet|nutrition|eat|drink)\b/.test(lower)) {
      return "diet/nutrition";
    }
    
    return "general medical inquiry";
  }

  // Check if current message is a follow-up
  isFollowUp(message) {
    const lower = message.toLowerCase();
    
    // Only treat as follow-up if we have active conversation context
    if (!this.sessionSummary && this.entities.symptoms.size === 0) {
      return false;
    }
    
    // Pronoun references
    const pronouns = /\b(this|that|it|they|these|those)\b/.test(lower);
    
    // Contextual reference words (not temporal ones)
    const references = /\b(you said|you mentioned|you told me|what you said|what you mentioned|as you mentioned)\b/.test(lower);
    
    // Follow-up phrases
    const followUpPhrases = /\b(elaborate|more|detail|explain|expand|tell me more|go deeper|specific|examples|specifics|about it|on this|on that)\b/.test(lower);
    
    return pronouns || references || followUpPhrases;
  }

  // Resolve pronoun references
  resolveReferences(message) {
    const lower = message.toLowerCase();
    let resolved = message;

    // Get the most recent significant entities
    const recentSymptoms = Array.from(this.entities.symptoms).slice(-2);
    const recentConditions = Array.from(this.entities.conditions).slice(-1);

    // Simple pronoun resolution
    if (/\b(this|that|it)\b/.test(lower) && recentSymptoms.length > 0) {
      const mainSymptom = recentSymptoms[recentSymptoms.length - 1];
      resolved = message.replace(/\b(this|that|it)\b/gi, mainSymptom);
    }

    return resolved;
  }

  // Get context for AI prompt
  getContextForPrompt() {
    if (this.sessionSummary) {
      return `\nConversation Context: ${this.sessionSummary}\n`;
    }
    return "";
  }

  // Get formatted conversation history
  getFormattedHistory() {
    return this.history.map(exchange => 
      `User: ${exchange.user}\nAssistant: ${exchange.assistant.substring(0, 150)}...`
    ).join('\n\n');
  }

  // Check if we have relevant context for a topic
  hasContextFor(topic) {
    const allEntities = [
      ...this.entities.symptoms,
      ...this.entities.conditions,
      ...this.entities.medications
    ].join(' ').toLowerCase();

    return allEntities.includes(topic.toLowerCase());
  }

  // Clear context (for new session)
  clearContext() {
    this.entities = {
      symptoms: new Set(),
      conditions: new Set(),
      medications: new Set(),
      body_parts: new Set(),
      treatments: new Set()
    };
    this.history = [];
    this.sessionSummary = "";
    this.lastUserQuery = "";
    this.lastBotResponse = "";
  }
}

export default ConversationContext;