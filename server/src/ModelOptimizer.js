// Model Performance Optimizer - Choose the fastest available model
import { getOllamaStatus } from './lightweight_query.js';

class ModelOptimizer {
  constructor() {
    this.modelPreferences = [
      { name: 'gemma3:1b', speed: 'ultra_fast', quality: 'good', size: '815MB' },
      { name: 'phi3:latest', speed: 'very_fast', quality: 'excellent', size: '2.2GB' },
      { name: 'llama3.2:3b', speed: 'fast', quality: 'excellent', size: '2.0GB' },
      { name: 'gemma3:4b', speed: 'medium', quality: 'excellent', size: '3.3GB' }
    ];
    this.currentBestModel = 'phi3:latest'; // Default to best balance
    this.lastOptimization = 0;
  }

  // Get the best model for current needs
  async getBestModel(prioritize = 'speed') {
    // Re-optimize every 5 minutes
    const now = Date.now();
    if (now - this.lastOptimization > 300000) {
      await this.optimizeModelSelection();
      this.lastOptimization = now;
    }

    if (prioritize === 'speed') {
      // Always prefer fastest available model
      return await this.getFastestAvailableModel();
    } else if (prioritize === 'quality') {
      // Balance speed and quality
      return await this.getBestQualitySpeedBalance();
    }

    return this.currentBestModel;
  }

  // Find fastest available model
  async getFastestAvailableModel() {
    try {
      const status = await getOllamaStatus();
      if (!status.available) {
        return null; // No Ollama available
      }

      const availableNames = status.models.map(name => name.toLowerCase());

      // Check preferred models against Ollama's actual model list.
      for (const model of this.modelPreferences) {
        if (availableNames.some(name => name === model.name || name.startsWith(`${model.name.split(':')[0]}:`))) {
          console.log(`🚀 Using fastest model: ${model.name} (${model.size})`);
          return model.name;
        }
      }

      // Fallback to any available model
      return status.fastestModel || null;

    } catch (error) {
      console.error('Model optimization error:', error);
      return this.currentBestModel;
    }
  }

  // Check if specific model is available
  async isModelAvailable(modelName) {
    try {
      // Simple way to check - could be enhanced with actual ollama list parsing
      return true; // Assume all models in our list are available
    } catch (error) {
      return false;
    }
  }

  // Get best quality-speed balance
  async getBestQualitySpeedBalance() {
    const available = this.modelPreferences.filter(m => 
      m.speed === 'very_fast' || m.speed === 'fast'
    );
    
    if (available.length > 0) {
      return available[0].name; // phi3:latest or llama3.2:3b
    }
    
    return await this.getFastestAvailableModel();
  }

  // Optimize model selection based on performance
  async optimizeModelSelection() {
    console.log('🔧 Optimizing model selection...');
    
    // Test response times for available models (simplified)
    const fastestModel = await this.getFastestAvailableModel();
    if (fastestModel) {
      this.currentBestModel = fastestModel;
      console.log(`✅ Optimized to use: ${fastestModel}`);
    }
  }

  // Get model info
  getModelInfo(modelName) {
    return this.modelPreferences.find(m => m.name === modelName) || 
           { name: modelName, speed: 'unknown', quality: 'unknown', size: 'unknown' };
  }
}

// Export singleton instance
export default new ModelOptimizer();