// Comprehensive dialogue state and symptom pipeline management
// Implements structured follow-ups, escalation logic, and natural conversation flow

class DialogueState {
  constructor() {
    this.currentTopic = null;
    this.severity = null;
    this.duration = null;
    this.redFlags = [];
    this.askedQuestions = new Set();
    this.currentStage = 'initial';
    this.turnCount = 0;
    this.userInfo = {};
    this.escalationTriggered = false;
    
    // Structured pipelines for different symptoms/topics
    this.pipelines = {
      headache: ['onset', 'severity', 'associated_symptoms', 'red_flags', 'escalation'],
      chest_pain: ['onset', 'severity', 'location', 'associated_symptoms', 'red_flags', 'escalation'],
      shortness_of_breath: ['onset', 'severity', 'triggers', 'associated_symptoms', 'red_flags', 'escalation'],
      fever: ['onset', 'temperature', 'associated_symptoms', 'duration', 'red_flags', 'escalation'],
      abdominal_pain: ['onset', 'location', 'severity', 'associated_symptoms', 'red_flags', 'escalation'],
      back_pain: ['onset', 'location', 'severity', 'triggers', 'associated_symptoms', 'escalation'],
      cough: ['onset', 'duration', 'type', 'associated_symptoms', 'red_flags', 'escalation'],
      fatigue: ['onset', 'duration', 'severity', 'triggers', 'associated_symptoms', 'lifestyle_factors'],
      treatment: ['current_symptoms', 'previous_treatments', 'effectiveness', 'contraindications', 'recommendations'],
      exercise: ['current_condition', 'fitness_level', 'goals', 'limitations', 'recommendations'],
      nutrition: ['current_diet', 'goals', 'restrictions', 'lifestyle', 'recommendations']
    };
    
    // Red flag combinations for escalation
    this.redFlagCombos = {
      'severe headache + vomiting': 'high',
      'severe headache + fever': 'high',
      'severe headache + vision changes': 'critical',
      'chest pain + shortness of breath': 'critical',
      'chest pain + sweating': 'high',
      'fever + severe headache + neck stiffness': 'critical',
      'abdominal pain + vomiting blood': 'critical',
      'severe back pain + leg numbness': 'high',
      'shortness of breath + chest pain': 'critical',
      'persistent cough + blood': 'high'
    };
    
    // Natural flow templates
    this.acknowledgmentTemplates = [
      "Thanks, got it.",
      "Okay, so",
      "I understand.",
      "Right, that helps.",
      "Got it, and",
      "Okay, that's helpful.",
      "I see, and"
    ];
    
    this.transitionTemplates = [
      "Now let me ask about",
      "Next, I'd like to know",
      "That's important. What about",
      "Good to know. How about",
      "Thanks for that. Now, regarding"
    ];
  }
  
  // Update dialogue state with new information
  updateState(userMessage, topic = null) {
    this.turnCount++;
    
    if (topic) {
      this.currentTopic = topic;
      this.currentStage = 'initial';
    }
    
    // Extract severity, duration, and red flags from message
    this.extractUserInfo(userMessage);
    
    // Check for red flag combinations
    this.checkRedFlags();
  }
  
  // Extract key information from user message
  extractUserInfo(message) {
    const lower = message.toLowerCase();
    
    // Extract severity
    if (/\b(severe|extreme|unbearable|worst|10\/10|intense)\b/.test(lower)) {
      this.severity = 'severe';
      this.userInfo.severity = 'severe';
    } else if (/\b(moderate|6\/10|7\/10|8\/10|bad|strong)\b/.test(lower)) {
      this.severity = 'moderate';
      this.userInfo.severity = 'moderate';
    } else if (/\b(mild|slight|light|3\/10|4\/10|5\/10)\b/.test(lower)) {
      this.severity = 'mild';
      this.userInfo.severity = 'mild';
    }
    
    // Extract duration
    if (/\b(\d+)\s+(hours?|hrs?)\b/.test(lower)) {
      const match = lower.match(/\b(\d+)\s+(hours?|hrs?)\b/);
      this.duration = `${match[1]} hours`;
      this.userInfo.duration = this.duration;
    } else if (/\b(\d+)\s+(days?)\b/.test(lower)) {
      const match = lower.match(/\b(\d+)\s+(days?)\b/);
      this.duration = `${match[1]} days`;
      this.userInfo.duration = this.duration;
    } else if (/\b(\d+)\s+(weeks?)\b/.test(lower)) {
      const match = lower.match(/\b(\d+)\s+(weeks?)\b/);
      this.duration = `${match[1]} weeks`;
      this.userInfo.duration = this.duration;
    }
    
    // Extract red flags
    const redFlagTerms = [
      'vomiting', 'blood', 'vision changes', 'confusion', 'fever', 'neck stiffness',
      'shortness of breath', 'chest pain', 'sweating', 'dizziness', 'fainting',
      'numbness', 'weakness', 'difficulty speaking', 'sudden onset'
    ];
    
    redFlagTerms.forEach(flag => {
      if (lower.includes(flag) && !this.redFlags.includes(flag)) {
        this.redFlags.push(flag);
        this.userInfo[flag] = true;
      }
    });
  }
  
  // Check for dangerous red flag combinations
  checkRedFlags() {
    for (const [combo, urgency] of Object.entries(this.redFlagCombos)) {
      const flags = combo.split(' + ');
      const hasAllFlags = flags.every(flag => 
        this.redFlags.some(userFlag => userFlag.includes(flag.replace(/\b(severe|persistent)\s+/, '')))
      );
      
      if (hasAllFlags && urgency === 'critical') {
        this.escalationTriggered = 'critical';
        return;
      } else if (hasAllFlags && urgency === 'high') {
        this.escalationTriggered = 'high';
      }
    }
  }
  
  // Get next question in the pipeline
  getNextStage(symptom) {
    const pipeline = this.pipelines[symptom] || this.pipelines.headache;
    const currentIndex = pipeline.indexOf(this.currentStage);
    
    if (currentIndex < pipeline.length - 1) {
      this.currentStage = pipeline[currentIndex + 1];
      return this.currentStage;
    }
    
    return 'complete';
  }
  
  // Generate structured follow-up question
  generateFollowUp(symptom, stage) {
    const acknowledgment = this.getRandomAcknowledgment();
    const transition = this.getRandomTransition();
    
    const questionTemplates = {
      headache: {
        onset: "when did this headache start? Was it sudden or gradual?",
        severity: "how would you rate the pain on a scale of 1-10?",
        associated_symptoms: "are you experiencing any nausea, vomiting, or vision changes?",
        red_flags: "do you have any fever, neck stiffness, or confusion along with it?",
        escalation: "have you had headaches like this before, or is this different?"
      },
      fever: {
        onset: "when did the fever start?",
        temperature: "what is your current temperature, if you have measured it?",
        associated_symptoms: "do you have chills, cough, rash, or body aches?",
        duration: "has the fever been constant or does it come and go?",
        red_flags: "do you have difficulty breathing, confusion, a stiff neck, or severe dehydration?",
        escalation: "how are you feeling overall compared with when the fever began?"
      },
      abdominal_pain: {
        onset: "when did the abdominal pain begin?",
        location: "where exactly do you feel it?",
        severity: "how severe is the pain on a scale of 1-10?",
        associated_symptoms: "do you have nausea, vomiting, diarrhea, fever, or blood in stool?",
        red_flags: "is the pain severe or worsening, or are you vomiting blood or unable to keep fluids down?",
        escalation: "is this pain similar to previous episodes?"
      },
      back_pain: {
        onset: "when did the back pain start?",
        location: "where in your back do you feel it, and does it spread anywhere?",
        severity: "how intense is the pain on a scale of 1-10?",
        triggers: "does movement, rest, or a particular position make it better or worse?",
        associated_symptoms: "do you have leg weakness, numbness, tingling, or bladder or bowel changes?",
        escalation: "was the pain caused by an injury or did it begin on its own?"
      },
      cough: {
        onset: "when did the cough begin?",
        duration: "has it been continuous, or does it come and go?",
        type: "is it dry or does it produce mucus?",
        associated_symptoms: "do you have fever, wheezing, chest pain, or shortness of breath?",
        red_flags: "are you coughing up blood or having severe breathing difficulty?",
        escalation: "has this cough been worse at night or after activity?"
      },
      fatigue: {
        onset: "when did you first start feeling tired?",
        duration: "has this been for a few days, weeks, or longer?",
        severity: "is the fatigue mild, or is it affecting your normal daily activities?",
        triggers: "does it improve with rest or get worse during certain activities?",
        associated_symptoms: "do you have fever, weight changes, dizziness, shortness of breath, or pain?",
        lifestyle_factors: "how have your sleep, diet, stress, and activity levels been lately?"
      },
      chest_pain: {
        onset: "when did the chest pain begin? Was it sudden?",
        severity: "how intense is the pain on a scale of 1-10?",
        location: "where exactly in your chest do you feel it? Does it spread anywhere?",
        associated_symptoms: "are you having trouble breathing, sweating, or nausea?",
        red_flags: "do you feel dizzy, have jaw pain, or arm pain with it?",
        escalation: "is this pain different from anything you've felt before?"
      },
      shortness_of_breath: {
        onset: "when did you first notice the breathing difficulty?",
        severity: "how hard is it to breathe? Can you speak in full sentences?",
        triggers: "what seems to make it worse - activity, lying down, or just at rest?",
        associated_symptoms: "do you have chest pain, coughing, or wheezing?",
        red_flags: "are you having chest pain, blue lips, or severe difficulty speaking?",
        escalation: "is this breathing problem new for you?"
      },
      treatment: {
        current_symptoms: "what specific symptoms are you looking to treat?",
        previous_treatments: "what have you already tried for this?",
        effectiveness: "how well did those treatments work?",
        contraindications: "do you have any allergies or take any medications?",
        recommendations: "based on what you've told me, here are some options:"
      },
      exercise: {
        current_condition: "what's your current fitness level and any physical limitations?",
        fitness_level: "how often do you currently exercise?",
        goals: "what are you hoping to achieve with exercise?",
        limitations: "do you have any injuries or conditions I should know about?",
        recommendations: "here are some exercises that might work well for you:"
      },
      nutrition: {
        current_diet: "what does your current diet typically look like?",
        goals: "what are your nutrition goals - energy, weight, health condition?",
        restrictions: "do you have any dietary restrictions or allergies?",
        lifestyle: "how is your current eating schedule and lifestyle?",
        recommendations: "based on your needs, here are some suggestions:"
      }
    };
    
    const questions = questionTemplates[symptom] || questionTemplates.headache;
    const question = questions[stage];
    
    if (!question) return null;
    
    // Vary the response structure
    if (this.turnCount <= 2) {
      return `${acknowledgment} ${transition} ${question}`;
    } else {
      return `${transition} ${question}`;
    }
  }
  
  // Generate escalation template
  generateEscalation() {
    if (this.escalationTriggered === 'critical') {
      return "🚨 **URGENT MEDICAL ATTENTION NEEDED** 🚨\n\nBased on your symptoms, this could be a medical emergency. Please:\n• Call 911 immediately\n• Go to the nearest emergency room\n• Don't wait or drive yourself\n\nThese symptoms require immediate professional evaluation.";
    } else if (this.escalationTriggered === 'high') {
      return "⚠️ **SEEK MEDICAL CARE SOON** ⚠️\n\nYour combination of symptoms warrants prompt medical attention. Please:\n• Contact your doctor today\n• Go to urgent care if your doctor isn't available\n• Don't delay - these symptoms can be serious\n\nWould you like me to explain why these symptoms are concerning?";
    }
    
    return null;
  }
  
  // Generate summary after 2-3 turns
  generateSummary() {
    if (this.turnCount < 2) return null;
    
    let summary = "So you've had ";
    
    if (this.currentTopic) {
      summary += this.currentTopic;
    }
    
    if (this.userInfo.duration) {
      summary += ` for ${this.userInfo.duration}`;
    }
    
    if (this.userInfo.severity) {
      summary += ` with ${this.userInfo.severity} intensity`;
    }
    
    if (this.redFlags.length > 0) {
      summary += ` along with ${this.redFlags.slice(0, 2).join(' and ')}`;
    }
    
    summary += ". ";
    
    return summary;
  }
  
  // Get random acknowledgment
  getRandomAcknowledgment() {
    return this.acknowledgmentTemplates[Math.floor(Math.random() * this.acknowledgmentTemplates.length)];
  }
  
  // Get random transition
  getRandomTransition() {
    return this.transitionTemplates[Math.floor(Math.random() * this.transitionTemplates.length)];
  }
  
  // Check if question already asked
  hasAsked(question) {
    return this.askedQuestions.has(question);
  }
  
  // Mark question as asked
  markAsked(question) {
    this.askedQuestions.add(question);
  }
  
  // Reset state for new conversation
  reset() {
    this.currentTopic = null;
    this.severity = null;
    this.duration = null;
    this.redFlags = [];
    this.askedQuestions.clear();
    this.currentStage = 'initial';
    this.turnCount = 0;
    this.userInfo = {};
    this.escalationTriggered = false;
  }
}

export default DialogueState;