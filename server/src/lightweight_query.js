import ollama from 'ollama';
import ConversationContext from './ConversationContext.js';
import DialogueState from './DialogueState.js';

// Enhanced response format system with concise, conversational responses
// Provides structured format: disclaimer → main info → follow-up question

// Global context manager for session persistence
const globalContext = new ConversationContext();

// Global dialogue state for structured conversations
const dialogueState = new DialogueState();

// Fallback medical knowledge for when vector search has issues
const conciseMedicalKnowledge = {
  symptoms: {
    "headache": "Headaches can be caused by stress, dehydration, lack of sleep, or underlying conditions. Common types include tension headaches and migraines.\n\n**For severe, sudden headaches or those with fever, vision changes, or neck stiffness - see a doctor immediately.**\n\nWould you like me to explain any of these causes in more detail?",
    "shortness of breath": "⚠️ *I'm an AI assistant providing general health information only. Always consult healthcare professionals for medical advice.*\n\nShortness of breath can result from heart conditions, lung issues like asthma or COPD, anxiety, or being out of shape.\n\n**Seek immediate help if severe, sudden, or with chest pain.**\n\nWould you like me to explain any specific causes in more detail?",
    "fever": "Fever is your body's response to infection or illness. Usually caused by viruses, bacteria, or other infections.\n\n**See a doctor for fever above 103°F (39.4°C), lasting more than 3 days, or with severe symptoms.**\n\nWould you like me to explain fever management in more detail?",
    "mild pain": "Mild pain is often your body's way of signaling minor injury or strain. Common causes include muscle tension, minor injuries, or overuse.\n\nWould you like me to explain some gentle management techniques?",
    "fatigue": "Fatigue can result from lack of sleep, stress, poor diet, or underlying health conditions. It's very common and usually manageable.\n\nWould you like me to explain some energy-boosting strategies?"
  },
  treatments: {
    "headache": "Common headache treatments include rest in a dark room, staying hydrated, gentle neck stretches, and over-the-counter pain relievers (as directed on the package).\n\n**For frequent headaches or if treatments don't help, consult a healthcare provider.**\n\nWould you like me to explain any of these treatments in more detail?",
    "pain": "General pain management includes rest, ice/heat therapy (15-20 minutes), gentle movement when possible, and over-the-counter pain relief (follow package directions).\n\n**Don't ignore persistent or severe pain - see a healthcare provider.**\n\nWould you like me to explain any specific pain management technique?",
    "mild symptoms": "For mild symptoms, general approaches include rest, hydration, good nutrition, and monitoring how you feel.\n\nWould you like me to explain some specific self-care strategies?"
  }
};

// Enhanced intent detection with context awareness and dialogue state
export function detectIntent(message = "") {
  const lower = (message || "").toLowerCase();
  
  // Check if it's a follow-up using context awareness
  if (globalContext.isFollowUp(message)) {
    return 'contextual_followup';
  }
  
  // Emergency patterns - highest priority
  const emergencyWords = [
    'chest pain', 'heart attack', 'can\'t breathe', 'difficulty breathing', 'choking',
    'unconscious', 'bleeding heavily', 'severe pain', 'stroke', 'seizure',
    'emergency', '911', 'dying', 'collapsed', 'overdose', 'poisoning'
  ];
  
  for (const word of emergencyWords) {
    if (lower.includes(word)) return "emergency";
  }

  // Greetings
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|greetings|salutations|how are you)$/i.test(lower.trim())) {
    return "greeting";
  }
  
  // Detect specific symptom types for structured pipelines
  if (/\b(headache|migraine|head pain)\b/.test(lower)) {
    return "headache";
  }
  if (/\b(chest pain|heart|cardiac)\b/.test(lower)) {
    return "chest_pain";
  }
  if (/\b(shortness of breath|breathing|respiratory|asthma|copd)\b/.test(lower)) {
    return "shortness_of_breath";
  }
  if (/\b(fever|temperature|hot|chills)\b/.test(lower)) {
    return "fever";
  }
  if (/\b(stomach|abdominal|belly|gut|nausea)\b/.test(lower)) {
    return "abdominal_pain";
  }
  if (/\b(back pain|spine|lower back|upper back)\b/.test(lower)) {
    return "back_pain";
  }
  if (/\b(cough|coughing|throat)\b/.test(lower)) {
    return "cough";
  }
  if (/\b(tired|fatigue|exhausted|energy|weakness)\b/.test(lower)) {
    return "fatigue";
  }
  
  // Medical categories
  if (/\b(treat|treatment|therapy|medicine|medication|drug|cure|heal|remedy)\b/.test(lower)) {
    return "treatment";
  }
  if (/\b(exercise|workout|fitness|physical activity|gym)\b/.test(lower)) {
    return "exercise";
  }
  if (/\b(food|eat|diet|nutrition|vitamin|supplement|meal)\b/.test(lower)) {
    return "nutrition";
  }
  if (/\b(symptom|sign|feel|experiencing|have|pain|ache|hurt|sore)\b/.test(lower)) {
    return "symptoms";
  }
  if (/\b(cause|reason|why|what makes|lead to|result|due to|because|trigger)\b/.test(lower)) {
    return "causes";
  }
  if (/\b(prevent|prevention|avoid|stop|reduce risk|protect|vaccination|vaccine)\b/.test(lower)) {
    return "prevention";
  }
  
  return "general";
}

// Check if message requires serious medical disclaimer
function checkIfNeedsDisclaimer(message) {
  const lower = message.toLowerCase();
  
  // Serious symptoms that need disclaimer
  const seriousSymptoms = [
    'chest pain', 'heart attack', 'stroke', 'seizure', 'bleeding', 'blood',
    'severe pain', 'can\'t breathe', 'difficulty breathing', 'poisoning',
    'overdose', 'suicide', 'self harm', 'cancer', 'tumor', 'lump',
    'severe headache', 'vision loss', 'paralysis', 'unconscious'
  ];
  
  // Medical treatments/procedures that need disclaimer
  const seriousTreatments = [
    'surgery', 'operation', 'prescription', 'medication dosage', 'insulin',
    'blood pressure medication', 'chemotherapy', 'radiation', 'injection'
  ];
  
  // Pregnancy/children related that needs disclaimer
  const pregnancyChildren = [
    'pregnancy', 'pregnant', 'baby', 'infant', 'child medication', 'pediatric'
  ];
  
  return seriousSymptoms.some(symptom => lower.includes(symptom)) ||
         seriousTreatments.some(treatment => lower.includes(treatment)) ||
         pregnancyChildren.some(term => lower.includes(term));
}

// Check if message requires "when to see a doctor" advice
function checkIfNeedsDoctorAdvice(message) {
  const lower = message.toLowerCase();
  
  // Symptoms that warrant doctor visit
  const urgentSymptoms = [
    'severe', 'persistent', 'chronic', 'worsening', 'getting worse',
    'blood', 'bleeding', 'fever', 'high fever', 'chest pain',
    'shortness of breath', 'difficulty breathing', 'severe headache',
    'vision changes', 'sudden', 'sharp pain', 'intense pain',
    'swelling', 'rash', 'infection', 'wound', 'injury'
  ];
  
  // Duration indicators that suggest doctor visit
  const durationIndicators = [
    'weeks', 'months', 'long time', 'won\'t go away', 'not getting better',
    'keeps coming back', 'recurring', 'chronic'
  ];
  
  return urgentSymptoms.some(symptom => lower.includes(symptom)) ||
         durationIndicators.some(indicator => lower.includes(indicator));
}

// Create context-aware prompts
function createConcisePrompt(message, intent, contextText) {
  const conversationContext = globalContext.getContextForPrompt();
  const fullContext = contextText || "General medical knowledge";
  
  // Check if this requires serious medical disclaimer
  const needsDisclaimer = checkIfNeedsDisclaimer(message);
  const needsDoctorAdvice = checkIfNeedsDoctorAdvice(message);
  
  let basePrompt;
  
  switch(intent) {
    case "symptoms":
      if (needsDisclaimer) {
        basePrompt = `You are a medical AI assistant. Start your response with: "⚠️ *I'm an AI assistant providing general health information only. Always consult healthcare professionals for medical advice.*"

Question: ${message}
Context: ${fullContext}${conversationContext}

After the disclaimer, provide a brief, direct answer covering:
- Main symptoms (2-3 key points)
${needsDoctorAdvice ? '- When to see a doctor immediately' : ''}

Keep it conversational and under 150 words. End with: "Would you like me to explain any of these in more detail?"`;
      } else {
        basePrompt = `You are a helpful medical AI assistant providing general health information.

Question: ${message}
Context: ${fullContext}${conversationContext}

Provide a brief, friendly response covering:
- Main symptoms (2-3 key points)
${needsDoctorAdvice ? '- When to see a doctor' : ''}

Keep it conversational and under 150 words. End with: "Would you like me to explain any of these in more detail?"`;
      }
      break;
      
    case "treatments":
      if (needsDisclaimer) {
        basePrompt = `You are a medical AI assistant. Start your response with: "⚠️ *I'm an AI assistant providing general health information only. Always consult healthcare professionals for medical advice.*"

Question: ${message}
Context: ${fullContext}${conversationContext}

After the disclaimer, provide a concise response covering:
- 2-3 main treatment approaches
- Important safety considerations

Keep it conversational and under 150 words. End with: "Would you like me to explain any of these treatments in more detail?"`;
      } else {
        basePrompt = `You are a helpful medical AI assistant providing general health information.

Question: ${message}
Context: ${fullContext}${conversationContext}

Provide a friendly response covering:
- 2-3 common treatment approaches
- General safety notes

Keep it conversational and under 150 words. End with: "Would you like me to explain any of these treatments in more detail?"`;
      }
      break;
      
    case "contextual_followup":
      // For follow-ups, determine if we need disclaimer based on context
      if (globalContext.sessionSummary && checkIfNeedsDisclaimer(globalContext.sessionSummary)) {
        basePrompt = `You are a medical AI assistant providing detailed follow-up information.

Conversation Context: ${globalContext.sessionSummary || 'Previous medical discussion'}
Current Follow-up Request: ${message}

IMPORTANT: 
- This is a follow-up request for MORE DETAILED information about the previous medical topic
- Focus specifically on the medical topic we were just discussing
- DO NOT provide general encyclopedia content or unrelated information
- Provide detailed, relevant medical information related to the previous conversation

Start with: "⚠️ *I'm an AI assistant providing general health information only. Always consult healthcare professionals for medical advice.*"

Then provide detailed information (200-300 words) about the specific medical topic from our previous conversation. Include:
- Detailed explanation of the condition/symptoms
- Comprehensive treatment options
- When to seek medical care (if applicable)
- Relevant prevention tips

Keep it medically relevant and detailed, not general encyclopedia content.`;
      } else {
        basePrompt = `You are a helpful medical AI assistant providing detailed follow-up information.

Conversation Context: ${globalContext.sessionSummary || 'Previous medical discussion'}
Current Follow-up Request: ${message}

IMPORTANT: 
- This is a follow-up request for MORE DETAILED information about the previous topic
- Focus specifically on the health topic we were just discussing
- Provide detailed, relevant information related to the previous conversation

Provide detailed information (200-300 words) about the specific health topic from our previous conversation. Include:
- Detailed explanation of the condition/symptoms
- Treatment and management options
- Prevention and lifestyle tips

Keep it informative and detailed.`;
      }
      break;
      
    default:
      if (needsDisclaimer) {
        basePrompt = `You are a medical AI assistant. Start your response with: "⚠️ *I'm an AI assistant providing general health information only. Always consult healthcare professionals for medical advice.*"

Question: ${message}
Context: ${fullContext}${conversationContext}

After the disclaimer, provide a helpful, concise response in a conversational tone. Keep it under 150 words and end with a follow-up question to engage the user.`;
      } else {
        basePrompt = `You are a helpful health AI assistant providing general wellness information.

Question: ${message}
Context: ${fullContext}${conversationContext}

Provide a friendly, helpful response in a conversational tone. Keep it under 150 words and end with a follow-up question to engage the user.`;
      }
  }
  
  return basePrompt;
}

// Handle structured symptom conversations with pipelines
async function handleStructuredSymptom(message, symptomType, startTime) {
  console.log(`🩺 STRUCTURED SYMPTOM: ${symptomType} - Stage: ${dialogueState.currentStage}`);
  
  // Generate summary if we have enough information
  const summary = dialogueState.generateSummary();
  
  // Check if we need to progress through the pipeline
  const nextStage = dialogueState.getNextStage(symptomType);
  
  if (nextStage === 'complete' || dialogueState.currentStage === 'escalation') {
    // Provide comprehensive response and recommendations
    return await generateComprehensiveResponse(message, symptomType, summary, startTime);
  }
  
  // Generate next structured question
  const followUpQuestion = dialogueState.generateFollowUp(symptomType, nextStage);
  
  if (followUpQuestion && !dialogueState.hasAsked(followUpQuestion)) {
    dialogueState.markAsked(followUpQuestion);
    
    // Create contextual response with follow-up
    let response = "";
    
    if (dialogueState.currentStage === 'onset' || dialogueState.turnCount === 1) {
      // Initial response with basic information
      response = getInitialSymptomResponse(symptomType);
      response += `\n\n${followUpQuestion}`;
    } else {
      // Structured follow-up
      response = summary ? `${summary}${followUpQuestion}` : followUpQuestion;
    }
    
    const result = {
      ok: true,
      type: "structured_followup",
      message: response,
      stage: nextStage,
      responseTime: Date.now() - startTime
    };
    
    return updateContextAndReturn(message, response, result);
  }
  
  // Fallback to general response
  return await generateGeneralResponse(message, symptomType, startTime);
}

// Handle structured topic conversations (treatment, exercise, nutrition)
async function handleStructuredTopic(message, topicType, startTime) {
  console.log(`📋 STRUCTURED TOPIC: ${topicType} - Stage: ${dialogueState.currentStage}`);
  
  const nextStage = dialogueState.getNextStage(topicType);
  
  if (nextStage === 'complete' || dialogueState.currentStage === 'recommendations') {
    return await generateTopicRecommendations(message, topicType, startTime);
  }
  
  const followUpQuestion = dialogueState.generateFollowUp(topicType, nextStage);
  
  if (followUpQuestion && !dialogueState.hasAsked(followUpQuestion)) {
    dialogueState.markAsked(followUpQuestion);
    
    let response = "";
    
    if (dialogueState.turnCount === 1) {
      response = getInitialTopicResponse(topicType);
      response += `\n\n${followUpQuestion}`;
    } else {
      const summary = dialogueState.generateSummary();
      response = summary ? `${summary}${followUpQuestion}` : followUpQuestion;
    }
    
    const result = {
      ok: true,
      type: "structured_topic",
      message: response,
      stage: nextStage,
      responseTime: Date.now() - startTime
    };
    
    return updateContextAndReturn(message, response, result);
  }
  
  return await generateGeneralResponse(message, topicType, startTime);
}

// Get initial symptom response
function getInitialSymptomResponse(symptomType) {
  const responses = {
    headache: "I understand you're experiencing a headache. Headaches can have various causes like stress, dehydration, tension, or underlying conditions. Let me gather some details to better understand your situation.",
    chest_pain: "⚠️ *I'm an AI assistant providing general health information only. Always consult healthcare professionals for medical advice.*\n\nI see you're having chest pain. This can range from minor muscle strain to serious conditions, so it's important we understand the details.",
    shortness_of_breath: "⚠️ *I'm an AI assistant providing general health information only. Always consult healthcare professionals for medical advice.*\n\nI understand you're experiencing breathing difficulties. This can have several causes from anxiety to heart or lung conditions.",
    fever: "I see you have a fever. Fever is your body's natural response to fighting infection or illness. Let me understand more about your situation.",
    abdominal_pain: "I understand you're experiencing abdominal pain. This can range from minor digestive issues to more serious conditions, so let's gather some details.",
    back_pain: "I see you're dealing with back pain. This is very common and can result from muscle strain, posture, or other factors. Let me learn more about your specific situation.",
    cough: "I understand you have a cough. Coughs can be caused by infections, allergies, or other respiratory conditions. Let me gather some information.",
    fatigue: "I see you're experiencing fatigue. This can result from lifestyle factors, stress, or underlying health conditions. Let me understand your situation better."
  };
  
  return responses[symptomType] || "I understand you're experiencing symptoms. Let me gather some information to better help you.";
}

// Get initial topic response
function getInitialTopicResponse(topicType) {
  const responses = {
    treatment: "I'd be happy to help you explore treatment options. The best approach depends on your specific situation and symptoms.",
    exercise: "Great question about exercise! The right fitness routine depends on your current condition, goals, and any limitations you might have.",
    nutrition: "I'm glad you're focusing on nutrition! The best dietary approach depends on your individual needs, goals, and current situation."
  };
  
  return responses[topicType] || "I'd be happy to help with that. Let me understand your specific needs.";
}

// Generate comprehensive response for completed symptom pipeline
async function generateComprehensiveResponse(message, symptomType, summary, startTime) {
  const needsDisclaimer = checkIfNeedsDisclaimer(message) || dialogueState.severity === 'severe';
    
  const disclaimerInstruction = needsDisclaimer
    ? "Start with: ⚠️ *I am an AI assistant providing general health information only. Always consult healthcare professionals for medical advice.*"
    : "";
    
    const prompt = `You are a medical AI assistant providing comprehensive information about ${symptomType}.

${summary || ''}User's symptoms and details: ${JSON.stringify(dialogueState.userInfo)}

${disclaimerInstruction}

Provide a comprehensive response (4-6 lines) covering:
- Key information about this condition
- Management approaches appropriate for their situation
- Important safety considerations
- When to seek medical care if applicable

Keep it informative but concise, and end with asking if they would like more details about any aspect.`;

  const aiResult = await queryAIModel(prompt);
  const response = aiResult?.response;
    
  if (response && response.length > 50) {
      const result = {
        ok: true,
        type: "comprehensive_symptom",
        message: response,
        model_used: aiResult.model,
        responseTime: Date.now() - startTime
      };
      
    return updateContextAndReturn(message, response, result);
  }
  
  // Fallback comprehensive response
  const fallbackResponse = generateFallbackComprehensive(symptomType, summary);
  return updateContextAndReturn(message, fallbackResponse, {
    ok: true,
    type: "comprehensive_fallback",
    message: fallbackResponse,
    responseTime: Date.now() - startTime
  });
}

// Generate topic recommendations for treatment/exercise/nutrition
async function generateTopicRecommendations(message, topicType, startTime) {
  const needsDisclaimer = topicType === 'treatment' && checkIfNeedsDisclaimer(message);
    
    const prompt = `You are a helpful AI assistant providing ${topicType} recommendations.

User's information: ${JSON.stringify(dialogueState.userInfo)}

${needsDisclaimer ? "Start with: ⚠️ *I am an AI assistant providing general health information only. Always consult healthcare professionals for medical advice.*" : ""}

Provide specific recommendations (4-6 lines) for ${topicType} based on their information:
- 2-3 specific recommendations
- Important considerations for their situation
- Safety notes if applicable
- Next steps or progression

Keep it practical and actionable, ending with offering more details.`;

  const aiResult = await queryAIModel(prompt);
  const response = aiResult?.response;
    
  if (response && response.length > 50) {
      const result = {
        ok: true,
        type: "topic_recommendations",
        message: response,
        model_used: aiResult.model,
        responseTime: Date.now() - startTime
      };
      
    return updateContextAndReturn(message, response, result);
  }
  
  // Fallback recommendations
  const fallbackResponse = generateFallbackTopicRecommendations(topicType);
  return updateContextAndReturn(message, fallbackResponse, {
    ok: true,
    type: "topic_fallback",
    message: fallbackResponse,
    responseTime: Date.now() - startTime
  });
}

// Generate general response for non-structured conversations
async function generateGeneralResponse(message, intent, startTime) {
  const prompt = createConcisePrompt(message, intent, "");
  const aiResult = await queryAIModel(prompt);
  const response = aiResult?.response;
    
  if (response && response.length > 20) {
      const result = {
        ok: true,
        type: "general_response",
        message: response,
        model_used: aiResult.model,
        responseTime: Date.now() - startTime
      };
      
    return updateContextAndReturn(message, response, result);
  }
  
  // Use fallback knowledge base
  return await useFallbackKnowledge(message, intent, startTime);
}

// Generate fallback comprehensive response
function generateFallbackComprehensive(symptomType, summary) {
  const responses = {
    headache: `${summary || ''}Based on what you've told me, headaches can often be managed with rest, hydration, stress reduction, and over-the-counter pain relief when appropriate. For persistent, severe, or unusual headaches, especially with other symptoms, it's important to consult a healthcare provider. Would you like me to explain more about any specific management approaches?`,
    
    chest_pain: "⚠️ *I'm an AI assistant providing general health information only. Always consult healthcare professionals for medical advice.*\n\nChest pain should always be taken seriously. While it can have various causes from muscle strain to heart conditions, the combination of symptoms you've described warrants professional medical evaluation. Please consider contacting your healthcare provider or emergency services if the pain is severe or accompanied by other concerning symptoms.",
    
    shortness_of_breath: "⚠️ *I'm an AI assistant providing general health information only. Always consult healthcare professionals for medical advice.*\n\nBreathing difficulties can have many causes and should be evaluated by a healthcare professional, especially if severe or persistent. General measures like staying calm, sitting upright, and avoiding triggers may help mild cases, but professional evaluation is important for proper diagnosis and treatment.",
    
    fatigue: `${summary || ''}Fatigue management often involves addressing sleep quality, stress levels, nutrition, and physical activity. Regular sleep schedules, balanced nutrition, moderate exercise, and stress management can be helpful. However, persistent fatigue warrants medical evaluation to rule out underlying conditions. Would you like more details about any of these approaches?`
  };
  
  return responses[symptomType] || `${summary || ''}Based on your symptoms, it's important to monitor how you're feeling and consider consulting with a healthcare provider for proper evaluation and guidance. Would you like me to explain more about any specific aspect?`;
}

// Generate fallback topic recommendations
function generateFallbackTopicRecommendations(topicType) {
  const responses = {
    treatment: "For effective treatment, it's important to address the underlying cause and severity of symptoms. General approaches include rest, appropriate self-care measures, and knowing when to seek professional help. Over-the-counter options may help mild symptoms, but persistent or severe issues need medical evaluation. Would you like more specific information about any treatment approach?",
    
    exercise: "A good exercise routine should be tailored to your current fitness level and any limitations. Start gradually with activities you enjoy - walking, swimming, or light strength training are great options. Listen to your body, stay consistent, and progress slowly. Always consult with healthcare providers if you have health conditions. Would you like specific exercise suggestions for your situation?",
    
    nutrition: "A balanced diet with plenty of vegetables, fruits, whole grains, and adequate protein supports overall health and energy. Stay hydrated, limit processed foods, and consider your individual needs and restrictions. Small, consistent changes often work better than dramatic diet overhauls. Would you like specific nutrition recommendations based on your goals?"
  };
  
  return responses[topicType] || "Based on your needs, a personalized approach considering your specific situation and goals would be most effective. Would you like more detailed recommendations?";
}

// Use fallback knowledge base
async function useFallbackKnowledge(message, intent, startTime) {
  console.log("📚 Using fallback knowledge base...");
  const knowledgeSection = conciseMedicalKnowledge[intent] || conciseMedicalKnowledge.symptoms;
  
  for (const [key, response] of Object.entries(knowledgeSection)) {
    if (message.toLowerCase().includes(key) || key.split(' ').some(word => message.toLowerCase().includes(word))) {
      return updateContextAndReturn(message, response, {
        ok: true,
        type: "knowledge",
        message: response,
        source: "fallback_knowledge",
        responseTime: Date.now() - startTime
      });
    }
  }
  
  // Final fallback
  const needsDisclaimer = checkIfNeedsDisclaimer(message);
  const fallbackResponse = needsDisclaimer 
    ? "⚠️ *I'm an AI assistant providing general health information only. Always consult healthcare professionals for medical advice.*\n\nI'm here to help with medical questions, but I need more specific information to provide the best assistance. Could you tell me more about your symptoms or health concern?\n\nWould you like to ask about a specific symptom or condition?"
    : "I'm here to help with health and wellness questions! Could you tell me more about what you'd like to know? I can help with:\n\n• Common symptoms and their causes\n• General health and wellness tips\n• Nutrition and lifestyle advice\n• Basic first aid information\n\nWhat specific health topic interests you?";
  
  return updateContextAndReturn(message, fallbackResponse, {
    ok: true,
    type: "general_medical",
    message: fallbackResponse,
    responseTime: Date.now() - startTime
  });
}

// Simple Ollama query function
async function queryOllamaLight(prompt, model = 'gemma3:1b') {
  try {
    const response = await ollama.generate({
      model: model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3,
        top_p: 0.8,
        num_predict: 220
      }
    });

    return response.response?.trim() || "";
  } catch (error) {
    console.error("Ollama query error:", error.message);
    return null;
  }
}

async function queryGeminiLight(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          maxOutputTokens: 220
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Gemini request failed with status ${response.status}`);
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim();

    return text || null;
  } catch (error) {
    console.error('Gemini query error:', error.message);
    return null;
  }
}

async function queryAIModel(prompt) {
  if (process.env.GEMINI_API_KEY) {
    console.log('🤖 Querying Gemini...');
    const geminiResponse = await queryGeminiLight(prompt);
    if (geminiResponse) {
      return {
        response: geminiResponse,
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash'
      };
    }
  }

  const ollamaStatus = await getOllamaStatus();
  if (ollamaStatus.available && ollamaStatus.fastestModel) {
    console.log(`🤖 Querying Ollama: ${ollamaStatus.fastestModel}`);
    const ollamaResponse = await queryOllamaLight(prompt, ollamaStatus.fastestModel);
    if (ollamaResponse) {
      return { response: ollamaResponse, model: ollamaStatus.fastestModel };
    }
  }

  return null;
}

// Check Ollama status
async function getOllamaStatus() {
  try {
    const models = await ollama.list();
    if (models && models.models && models.models.length > 0) {
      // Prioritize gemma3:1b as requested
      const preferredModels = ['gemma3:1b', 'gemma2:2b', 'llama3.2:3b', 'qwen2.5:3b'];
      const fastestModel = preferredModels.find(model => 
        models.models.some(m => m.name.includes(model))
      ) || models.models[0].name;
      
      return {
        available: true,
        models: models.models.map(m => m.name),
        fastestModel: fastestModel
      };
    }
    return { available: false, models: [], fastestModel: null };
  } catch (error) {
    return { available: false, models: [], fastestModel: null };
  }
}

// Helper function to update context and return response
function updateContextAndReturn(userMessage, botResponse, responseObj) {
  // Update conversation context
  globalContext.updateContext(userMessage, botResponse);
  
  // Add context summary to response for debugging
  if (globalContext.sessionSummary) {
    responseObj.contextSummary = globalContext.sessionSummary;
  }
  
  return responseObj;
}

// Main answer generation function with structured dialogue
export async function generateAnswer({ message, history = [] }, contextChunks = []) {
  try {
    console.log(`🔍 Query: "${message.substring(0, 40)}..."`);
    
    const startTime = Date.now();
    
    // Resolve references using context
    const resolvedMessage = globalContext.resolveReferences(message);
    const intent = detectIntent(resolvedMessage);
    console.log(`🎯 Intent: ${intent} | Context entities: ${JSON.stringify(Array.from(globalContext.entities.symptoms).slice(0, 3))}`);
    
    // Update dialogue state
    const isSymptomType = ['headache', 'chest_pain', 'shortness_of_breath', 'fever', 'abdominal_pain', 'back_pain', 'cough', 'fatigue'].includes(intent);
    const isStructuredType = ['treatment', 'exercise', 'nutrition'].includes(intent);
    
    if (isSymptomType || isStructuredType) {
      dialogueState.updateState(resolvedMessage, intent);
    }
    
    // Check for escalation first
    const escalation = dialogueState.generateEscalation();
    if (escalation) {
      return updateContextAndReturn(resolvedMessage, escalation, {
        ok: true,
        type: "escalation",
        message: escalation,
        urgency: dialogueState.escalationTriggered,
        responseTime: Date.now() - startTime
      });
    }
    
    // Handle emergency immediately
    if (intent === "emergency") {
      console.log("🚨 EMERGENCY - Immediate response");
      return {
        ok: true,
        type: "emergency",
        message: "🚨 **MEDICAL EMERGENCY** 🚨\n\nCALL 911 IMMEDIATELY or go to the nearest emergency room.\n\nDo not wait or rely on AI for emergency medical situations. Get professional help now!\n\n• Call 911 (US)\n• Go to nearest ER\n• Call local emergency services",
        priority: "critical",
        responseTime: Date.now() - startTime
      };
    }
    
    // Handle greetings
    if (intent === "greeting") {
      console.log("👋 GREETING - Quick friendly response");
      const greetingMessage = "Hello! 👋 I'm your medical AI assistant. I can help you with health questions, symptoms, treatments, nutrition advice, and wellness tips. What would you like to know about?";
      
      return updateContextAndReturn(resolvedMessage, greetingMessage, {
        ok: true,
        type: "greeting",
        message: greetingMessage,
        responseTime: Date.now() - startTime
      });
    }
    
    // Handle structured symptom conversations
    if (isSymptomType) {
      return await handleStructuredSymptom(resolvedMessage, intent, startTime);
    }
    
    // Handle structured topic conversations (treatment, exercise, nutrition)
    if (isStructuredType) {
      return await handleStructuredTopic(resolvedMessage, intent, startTime);
    }
    
    // Handle contextual follow-ups with enhanced context awareness
    if (intent === "contextual_followup") {
      console.log("🔄 CONTEXTUAL FOLLOW-UP - Using context awareness");
      
      // Check if we have conversation context
      if (globalContext.sessionSummary || (history && history.length > 0)) {
        const lastExchange = history && history.length > 0 ? history[history.length - 1] : null;
        const lastUserMessage = lastExchange?.user || lastExchange?.message;
        
        console.log(`📝 Context: ${globalContext.sessionSummary || 'Using history'}`);
        console.log(`📝 Last query: "${lastUserMessage ? lastUserMessage.substring(0, 50) : 'none'}..."`);
        
        const contextualPrompt = createConcisePrompt(resolvedMessage, intent, "");
        const aiResult = await queryAIModel(contextualPrompt);

        if (aiResult?.response && aiResult.response.length > 50) {
          const response = aiResult.response;
            console.log(`✅ Contextual follow-up response in ${Date.now() - startTime}ms`);
            
            const result = {
              ok: true,
              type: "contextual_detailed",
              message: response,
              model_used: aiResult.model,
              contextUsed: true,
              responseTime: Date.now() - startTime
            };
            
            return updateContextAndReturn(resolvedMessage, response, result);
        }
        
        // Fallback: Provide a generic clarification based on context
        const fallbackMessage = globalContext.sessionSummary 
          ? `I see you want more details about ${globalContext.sessionSummary.substring(0, 100)}. Could you be more specific about what aspect you'd like me to explain further?`
          : `I see you're asking for clarification about your previous question. Could you be more specific about what aspect you'd like me to explain further?`;
          
        return updateContextAndReturn(resolvedMessage, fallbackMessage, {
          ok: true,
          type: "contextual_fallback",
          message: fallbackMessage + "\n\nFor example:\n• Symptoms and signs\n• Treatment options\n• Causes and risk factors\n• Prevention measures\n\nWhat specific part would you like me to elaborate on?",
          responseTime: Date.now() - startTime
        });
      }
      
      // No relevant context found - ask for clarification
      console.log("❓ No medical context found - asking for clarification");
      const clarificationMessage = "I'm not sure what you're asking about. Could you please be more specific? I can help you with:\n\n• Medical symptoms and conditions\n• Treatment information\n• Health and nutrition advice\n• Disease prevention\n\nWhat health topic would you like to know more about?";
      
      return updateContextAndReturn(resolvedMessage, clarificationMessage, {
        ok: true,
        type: "needs_clarification", 
        message: clarificationMessage,
        responseTime: Date.now() - startTime
      });
    }
    
    // Query the configured hosted model, with Ollama as a local fallback
    const aiResult = await queryAIModel(createConcisePrompt(resolvedMessage, intent, ""));

    if (aiResult?.response) {
      const prompt = createConcisePrompt(resolvedMessage, intent, "");
      const response = aiResult.response;
      
      if (response && response.length > 20) {
        console.log(`✅ AI response in ${Date.now() - startTime}ms`);
        
        const result = {
          ok: true,
          type: "medical",
          message: response,
          model_used: aiResult.model,
          responseTime: Date.now() - startTime
        };
        
        return updateContextAndReturn(resolvedMessage, response, result);
      }
    }
    
    // Fallback using concise knowledge base
    console.log("📚 Using concise knowledge base...");
    const knowledgeSection = conciseMedicalKnowledge[intent];
    
    if (knowledgeSection) {
      for (const [key, response] of Object.entries(knowledgeSection)) {
        if (resolvedMessage.toLowerCase().includes(key) || key.split(' ').some(word => resolvedMessage.toLowerCase().includes(word))) {
          return updateContextAndReturn(resolvedMessage, response, {
            ok: true,
            type: "knowledge",
            message: response,
            source: "concise_knowledge",
            responseTime: Date.now() - startTime
          });
        }
      }
    }
    
    // Final fallback
    const needsDisclaimer = checkIfNeedsDisclaimer(resolvedMessage);
    const fallbackResponse = needsDisclaimer 
      ? "⚠️ *I'm an AI assistant providing general health information only. Always consult healthcare professionals for medical advice.*\n\nI'm here to help with medical questions, but I need more specific information to provide the best assistance. Could you tell me more about your symptoms or health concern?\n\nWould you like to ask about a specific symptom or condition?"
      : "I'm here to help with health and wellness questions! Could you tell me more about what you'd like to know? I can help with:\n\n• Common symptoms and their causes\n• General health and wellness tips\n• Nutrition and lifestyle advice\n• Basic first aid information\n\nWhat specific health topic interests you?";
    
    return updateContextAndReturn(resolvedMessage, fallbackResponse, {
      ok: true,
      type: "general_medical",
      message: fallbackResponse,
      responseTime: Date.now() - startTime
    });
    
  } catch (error) {
    console.error("Error in generateAnswer:", error);
    return {
      ok: false,
      error: "I'm having technical difficulties. Please try again or consult a healthcare professional for medical advice.",
      responseTime: Date.now() - (startTime || Date.now())
    };
  }
}

// Simple fallback for conversational queries
export async function generateFallback({ message, history = [] }) {
  const responses = {
    greeting: "Hello! I'm your medical AI assistant. I can help with general health information, but always consult healthcare professionals for medical decisions.",
    thanks: "You're welcome! Feel free to ask any medical questions. Remember to consult healthcare professionals for medical advice.",
    goodbye: "Take care of your health! Remember, for any medical concerns, consult with qualified healthcare professionals."
  };
  
  const lower = message.toLowerCase();
  let response = "I'm here to help with medical questions. Please consult healthcare professionals for medical advice.";
  
  if (lower.includes('hello') || lower.includes('hi')) response = responses.greeting;
  else if (lower.includes('thank') || lower.includes('thanks')) response = responses.thanks;
  else if (lower.includes('bye') || lower.includes('goodbye')) response = responses.goodbye;
  
  return updateContextAndReturn(message, response, { ok: true, type: "conversational", message: response });
}

// Simple context retrieval function for compatibility
export async function getRelevantChunks(query, intent = null, topK = 5) {
  // For context-aware responses, we don't need complex vector search
  // Return empty matches to use knowledge base and context instead
  console.log(`📚 Context search for: "${query.substring(0, 50)}..." (intent: ${intent})`);
  
  return { 
    matches: [], 
    maxScore: 0, 
    qvec: [] 
  };
}

// Export utility functions for the Smart Medical Bot
export { queryOllamaLight, getOllamaStatus };