// 🧠 Advanced RAG Pipeline with Natural Response Generation
// Sophisticated knowledge retrieval and synthesis for medical AI

import OptimizedRAGIntegrationService from './OptimizedRAGIntegrationService.js';

class AdvancedMedicalRAGPipeline {
  constructor() {
    this.ragService = new OptimizedRAGIntegrationService();
    this.isInitialized = false;
    
    // Response synthesis templates for natural-sounding medical advice
    this.responseTemplates = {
      symptom_inquiry: {
        intro: [
          "Based on medical literature, the typical presentations include:",
          "Common manifestations of this condition often involve:",
          "Patients typically experience a constellation of symptoms such as:"
        ],
        structure: "symptom_list_with_context"
      },
      treatment_question: {
        intro: [
          "Current evidence-based treatment approaches include:",
          "Standard therapeutic interventions typically involve:",
          "The recommended treatment protocol generally consists of:"
        ],
        structure: "treatment_hierarchy"
      },
      diagnostic_question: {
        intro: [
          "Diagnostic evaluation typically follows a systematic approach:",
          "Clinical assessment usually involves several key components:",
          "Healthcare providers generally utilize the following diagnostic criteria:"
        ],
        structure: "diagnostic_workflow"
      }
    };
  }

  async initialize() {
    if (!this.isInitialized) {
      await this.ragService.initialize();
      this.isInitialized = true;
      console.log('🧠 Advanced Medical RAG Pipeline initialized');
    }
  }

  // 🔍 Enhanced knowledge retrieval with reranking
  async retrieveRelevantKnowledge(query, intent, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Step 1: Initial vector search
      const initialResults = await this.ragService.searchMedicalKnowledge(query, {
        topK: options.topK || 10,
        ...options
      });

      if (!initialResults.found) {
        return {
          passages: [],
          sources: [],
          confidence: 'low',
          totalResults: 0
        };
      }

      // Step 2: Apply reranking based on intent and relevance
      const rerankedPassages = this.reranKnowledgeByIntent(
        initialResults.chunks, 
        query, 
        intent
      );

      // Step 3: Apply similarity threshold filter
      const filteredPassages = rerankedPassages.filter(passage => 
        passage.score > (options.threshold || 0.5)
      );

      // Step 4: Extract and deduplicate sources
      const sources = [...new Set(filteredPassages.map(p => p.source))];

      return {
        passages: filteredPassages.slice(0, options.maxPassages || 5),
        sources,
        confidence: this.calculateConfidence(filteredPassages),
        totalResults: initialResults.totalResults,
        performance: initialResults.performance
      };

    } catch (error) {
      console.error('❌ Knowledge retrieval failed:', error.message);
      return {
        passages: [],
        sources: [],
        confidence: 'low',
        totalResults: 0,
        error: error.message
      };
    }
  }

  // 🎯 Intent-based passage reranking
  reranKnowledgeByIntent(passages, query, intent) {
    const intentWeights = {
      symptom_inquiry: { hasSymptoms: 2.0, hasDiagnostic: 1.5, hasTreatment: 1.0 },
      treatment_question: { hasTreatment: 2.0, hasSymptoms: 1.2, hasDiagnostic: 1.0 },
      diagnostic_question: { hasDiagnostic: 2.0, hasSymptoms: 1.5, hasTreatment: 1.0 },
      prevention_advice: { hasPrevention: 2.0, hasTreatment: 1.3, hasSymptoms: 1.0 },
      emergency: { hasEmergency: 3.0, hasSymptoms: 1.5, hasTreatment: 1.0 }
    };

    const weights = intentWeights[intent] || { default: 1.0 };

    return passages.map(passage => {
      let boostedScore = passage.score;
      
      // Apply intent-specific boosting
      for (const [property, weight] of Object.entries(weights)) {
        if (passage[property]) {
          boostedScore *= weight;
        }
      }

      // Query term proximity boost
      const queryTerms = query.toLowerCase().split(/\s+/);
      const passageText = passage.text.toLowerCase();
      const termMatches = queryTerms.filter(term => passageText.includes(term)).length;
      const proximityBoost = 1 + (termMatches / queryTerms.length) * 0.3;
      
      boostedScore *= proximityBoost;

      return {
        ...passage,
        originalScore: passage.score,
        boostedScore: Math.min(boostedScore, 1.0), // Cap at 1.0
        score: boostedScore
      };
    }).sort((a, b) => b.boostedScore - a.boostedScore);
  }

  // 📊 Calculate response confidence
  calculateConfidence(passages) {
    if (passages.length === 0) return 'low';
    
    const avgScore = passages.reduce((sum, p) => sum + p.score, 0) / passages.length;
    const sourceCount = new Set(passages.map(p => p.source)).size;
    
    if (avgScore > 0.75 && sourceCount >= 2) return 'high';
    if (avgScore > 0.6 && sourceCount >= 1) return 'medium';
    return 'low';
  }

  // 🎨 Generate natural, professional medical response
  async synthesizeNaturalResponse(query, knowledge, intent, detailedIntent) {
    if (!knowledge.passages || knowledge.passages.length === 0) {
      return this.generateFallbackResponse(query, intent);
    }

    try {
      // Select appropriate response template
      const template = this.responseTemplates[detailedIntent] || this.responseTemplates.symptom_inquiry;
      
      // Choose varied introduction
      const intro = template.intro[Math.floor(Math.random() * template.intro.length)];
      
      // Synthesize knowledge into coherent response
      const synthesizedContent = this.synthesizeKnowledgePassages(
        knowledge.passages, 
        detailedIntent
      );

      // Construct professional medical response
      let response = `${intro}\n\n${synthesizedContent}`;

      // Add appropriate clinical context
      if (knowledge.confidence === 'high') {
        response += "\n\nThis information reflects current clinical guidelines and evidence-based practices.";
      }

      // Add sources in natural format
      if (knowledge.sources.length > 0) {
        response += `\n\n*Clinical references: ${this.formatSourcesNaturally(knowledge.sources)}*`;
      }

      // Add standard medical disclaimer
      response += "\n\n**Important:** This information is for educational purposes. Always consult with qualified healthcare professionals for personalized medical advice, diagnosis, or treatment decisions.";

      return {
        response,
        hasKnowledge: true,
        confidence: knowledge.confidence,
        sources: knowledge.sources,
        passages: knowledge.passages.length,
        synthesized: true
      };

    } catch (error) {
      console.error('❌ Response synthesis failed:', error.message);
      return this.generateFallbackResponse(query, intent);
    }
  }

  // 🔄 Synthesize multiple knowledge passages into coherent content
  synthesizeKnowledgePassages(passages, intent) {
    // Group similar concepts
    const conceptGroups = this.groupPassagesByConcept(passages);
    
    let synthesized = "";

    // Generate structured, natural-sounding content
    switch (intent) {
      case 'symptom_inquiry':
        synthesized = this.synthesizeSymptomInformation(conceptGroups);
        break;
      case 'treatment_question':
        synthesized = this.synthesizeTreatmentInformation(conceptGroups);
        break;
      case 'diagnostic_question':
        synthesized = this.synthesizeDiagnosticInformation(conceptGroups);
        break;
      default:
        synthesized = this.synthesizeGeneralMedicalInformation(conceptGroups);
    }

    return synthesized;
  }

  // 📝 Group passages by medical concepts
  groupPassagesByConcept(passages) {
    const groups = {
      symptoms: [],
      treatments: [],
      diagnostics: [],
      prevention: [],
      emergency: [],
      general: []
    };

    passages.forEach(passage => {
      if (passage.hasSymptoms) groups.symptoms.push(passage);
      else if (passage.hasTreatment) groups.treatments.push(passage);
      else if (passage.hasDiagnostic) groups.diagnostics.push(passage);
      else if (passage.hasEmergency) groups.emergency.push(passage);
      else groups.general.push(passage);
    });

    return groups;
  }

  // 🩺 Synthesize symptom information naturally
  synthesizeSymptomInformation(groups) {
    let content = "";
    
    if (groups.symptoms.length > 0) {
      const symptomTexts = groups.symptoms
        .slice(0, 3)
        .map(p => this.extractKeyInformation(p.text))
        .filter(text => text.length > 0);
      
      content += symptomTexts.join(" Additionally, ");
    }

    if (groups.diagnostics.length > 0 && content.length > 0) {
      content += `\n\nFrom a diagnostic perspective, ${this.extractKeyInformation(groups.diagnostics[0].text)}`;
    }

    return content || "The available medical literature provides limited specific information on this topic.";
  }

  // 💊 Synthesize treatment information naturally
  synthesizeTreatmentInformation(groups) {
    let content = "";
    
    if (groups.treatments.length > 0) {
      const treatmentApproaches = groups.treatments
        .slice(0, 3)
        .map(p => this.extractKeyInformation(p.text))
        .filter(text => text.length > 0);
      
      content += treatmentApproaches.join(" Furthermore, ");
    }

    return content || "Treatment approaches vary based on individual patient factors and should be determined by healthcare providers.";
  }

  // 🔬 Synthesize diagnostic information naturally
  synthesizeDiagnosticInformation(groups) {
    let content = "";
    
    if (groups.diagnostics.length > 0) {
      const diagnosticInfo = groups.diagnostics
        .slice(0, 2)
        .map(p => this.extractKeyInformation(p.text))
        .filter(text => text.length > 0);
      
      content += diagnosticInfo.join(" In addition, ");
    }

    return content || "Diagnostic procedures and criteria are established through clinical protocols and should be conducted by qualified healthcare professionals.";
  }

  // 🔍 Extract key information and clean up text
  extractKeyInformation(text) {
    // Remove metadata markers
    let cleaned = text.replace(/\[Medical context:.*?\]/g, '').trim();
    
    // Remove leading dots and clean up
    cleaned = cleaned.replace(/^\.\s*/, '').trim();
    
    // Ensure proper sentence structure
    if (cleaned && !cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
      cleaned += '.';
    }

    return cleaned;
  }

  // 📚 Format sources naturally
  formatSourcesNaturally(sources) {
    if (sources.length === 1) {
      return `Source ${sources[0]}`;
    }
    return `Sources ${sources.join(', ')}`;
  }

  // 🔄 Generate fallback response
  generateFallbackResponse(query, intent) {
    const fallbacks = {
      medical_consultation: "I understand you're seeking medical information. While I can provide general health education, specific medical concerns require evaluation by qualified healthcare professionals who can assess your individual situation.",
      emergency: "🚨 For any medical emergency, please contact emergency services (911) immediately. Do not delay seeking professional medical help.",
      general_health: "I'm here to provide general health and wellness information. For specific health concerns or personalized advice, please consult with healthcare professionals."
    };

    return {
      response: fallbacks[intent] || "I'm here to provide general medical information. For specific health concerns, please consult with qualified healthcare professionals.",
      hasKnowledge: false,
      confidence: 'low',
      sources: [],
      passages: 0,
      synthesized: false
    };
  }

  // 📝 General medical information synthesis
  synthesizeGeneralMedicalInformation(groups) {
    const allGroups = [...groups.general, ...groups.symptoms, ...groups.treatments];
    
    if (allGroups.length > 0) {
      return allGroups
        .slice(0, 2)
        .map(p => this.extractKeyInformation(p.text))
        .filter(text => text.length > 0)
        .join(" Moreover, ");
    }

    return "The available medical literature provides general information on this topic.";
  }
}

export default AdvancedMedicalRAGPipeline;