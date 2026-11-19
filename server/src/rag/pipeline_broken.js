// 🧠 Complete RAG Pipeline Orchestrator for Medical Documents
// Integrates document processing, chunking, embedding, and vector storage

import path from 'path';
import Em    // 📄 Process documents individually (for incremental processing)
  async processDocuments() {
    console.log('📄 Processing documents...');
    const docsFolder = path.join(process.cwd(), 'docs');
    const result = await this.documentProcessor.processDocumentsFolder(docsFolder);
    console.log(`✅ Processed ${Object.keys(result).length} documents`);
    return result;
  }ervice from './embeddings.js';
import MedicalChunker from './chunking.js';
import DocumentProcessor from './documentProcessor.js';
import VectorStore from './vectorStore.js';

class MedicalRAGPipeline {
  constructor(options = {}) {
    this.embeddingModel = options.embeddingModel || 'nvidia'; // nvidia, fast, quality, ultrafast
    this.chunkingStrategy = options.chunkingStrategy || 'semantic'; // semantic, paragraph, sentence, large
    this.indexName = options.indexName || 'medical-knowledge-v2';
    this.namespace = options.namespace || 'medical-docs';
    
    // Initialize components
    this.embeddings = new EmbeddingService();
    this.chunker = new MedicalChunker();
    this.documentProcessor = new DocumentProcessor();
    this.vectorStore = new VectorStore({
      indexName: this.indexName,
      namespace: this.namespace
    });
    
    this.isInitialized = false;
    this.processingStats = {
      documentsProcessed: 0,
      chunksCreated: 0,
      vectorsUpserted: 0,
      processingTime: 0,
      errors: []
    };
  }

  // 🚀 Initialize the complete RAG pipeline
  async initialize() {
    if (this.isInitialized) {
      console.log('✅ RAG Pipeline already initialized');
      return;
    }

    console.log('🚀 Initializing Medical RAG Pipeline...');
    console.log(`📊 Configuration:`);
    console.log(`   Embedding Model: ${this.embeddingModel}`);
    console.log(`   Chunking Strategy: ${this.chunkingStrategy}`);
    console.log(`   Index: ${this.indexName}`);
    console.log(`   Namespace: ${this.namespace}`);

    try {
      // Initialize embedding service
      await this.embeddings.initialize(this.embeddingModel);
      
      // Initialize vector store
      await this.vectorStore.initialize();
      
      this.isInitialized = true;
      console.log('✅ RAG Pipeline initialized successfully!');
      
      // Display model information
      const modelInfo = this.embeddings.getModelInfo();
      console.log(`📏 Embedding Dimensions: ${modelInfo.dimensions}`);
      console.log(`🔗 Pinecone Index Requirements:`);
      console.log(`   - Dimension: ${modelInfo.dimensions}`);
      console.log(`   - Metric: cosine`);
      console.log(`   - Index Name: ${this.indexName}`);
      
    } catch (error) {
      console.error('❌ Pipeline initialization failed:', error.message);
      throw error;
    }
  }

  // 📚 Process and ingest documents from folder
  async ingestDocuments(docsFolder, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    console.log(`\n📚 Starting document ingestion from: ${docsFolder}`);
    
    try {
      // 1. Process all documents
      console.log('\n📄 Step 1: Processing documents...');
      const documents = await this.documentProcessor.processDocumentsFolder(docsFolder);
      this.processingStats.documentsProcessed = documents.length;

      // 2. Chunk all documents
      console.log('\n✂️ Step 2: Chunking documents...');
      const allChunks = [];
      
      for (const doc of documents) {
        const chunks = await this.chunker.chunkWithMetadata(
          doc.text, 
          doc.metadata.filename, 
          this.chunkingStrategy
        );
        
        // Add document metadata to chunks
        chunks.forEach(chunk => {
          chunk.metadata = {
            ...chunk.metadata,
            ...doc.metadata,
            documentText: doc.text.substring(0, 500) // First 500 chars for context
          };
        });
        
        allChunks.push(...chunks);
        console.log(`   📝 ${doc.metadata.filename}: ${chunks.length} chunks`);
      }

      this.processingStats.chunksCreated = allChunks.length;
      console.log(`\n📊 Total chunks created: ${allChunks.length}`);

      // 3. Generate embeddings
      console.log('\n🧠 Step 3: Generating embeddings...');
      const vectors = [];
      
      for (let i = 0; i < allChunks.length; i++) {
        const chunk = allChunks[i];
        
        try {
          const embedding = await this.embeddings.embed(chunk.text);
          
          vectors.push({
            id: chunk.id,
            values: embedding,
            metadata: {
              text: chunk.text,
              ...chunk.metadata
            }
          });
          
          if ((i + 1) % 100 === 0) {
            console.log(`   🔄 Embedded ${i + 1}/${allChunks.length} chunks`);
          }
          
        } catch (error) {
          console.error(`   ❌ Failed to embed chunk ${chunk.id}: ${error.message}`);
          this.processingStats.errors.push({
            chunkId: chunk.id,
            error: error.message,
            step: 'embedding'
          });
        }
      }

      console.log(`\n📊 Embeddings generated: ${vectors.length}/${allChunks.length}`);

      // 4. Upsert to vector store
      console.log('\n📤 Step 4: Upserting to vector store...');
      const upsertResult = await this.vectorStore.upsertVectors(vectors);
      this.processingStats.vectorsUpserted = upsertResult.success;

      // 5. Final statistics
      this.processingStats.processingTime = Date.now() - startTime;
      this.logIngestionResults();

      return {
        success: true,
        stats: this.processingStats,
        documents: documents.length,
        chunks: allChunks.length,
        vectors: vectors.length
      };

    } catch (error) {
      console.error('❌ Document ingestion failed:', error.message);
      this.processingStats.errors.push({
        step: 'pipeline',
        error: error.message
      });
      throw error;
    }
  }

    // � Process documents individually (for incremental processing)
  async processDocuments() {
    console.log('📄 Processing documents...');
    const docsFolder = path.join(process.cwd(), 'docs');
    const result = await this.documentProcessor.processDirectory(docsFolder);
    console.log(`✅ Processed ${Object.keys(result).length} documents`);
    return result;
  }

  // ✂️ Generate chunks individually (for incremental processing)
  async generateChunks(documentsData) {
    console.log('✂️ Generating chunks...');
    const chunksData = {};
    
    for (const [filename, docData] of Object.entries(documentsData)) {
      const chunks = await this.chunker.chunkText(
        docData.text,
        filename,
        this.chunkingStrategy
      );
      chunksData[filename] = chunks;
      console.log(`   📝 ${filename}: ${chunks.length} chunks`);
    }
    
    const totalChunks = Object.values(chunksData).reduce((sum, chunks) => sum + chunks.length, 0);
    console.log(`📊 Total chunks generated: ${totalChunks}`);
    return chunksData;
  }

  // 🧠 Generate single embedding (for incremental processing)
  async generateEmbedding(text) {
    return await this.embeddings.generateEmbedding(text);
  }

  // 📤 Upsert vectors to store (for incremental processing)
  async upsertVectors(vectors) {
    return await this.vectorStore.upsertVectors(vectors);
  }

  // 🔍 Query the knowledge base
  async query(question, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log(`🔍 Processing query: "${question.substring(0, 100)}..."`);
    
    try {
      // 1. Generate query embedding
      const queryEmbedding = await this.embeddings.embed(question);
      
      // 2. Search vector store
      const searchOptions = {
        topK: options.topK || 10,
        filter: options.filter,
        ...options
      };

      let searchResult;
      
      // Use specialized search if specified
      if (options.searchType === 'symptoms') {
        searchResult = await this.vectorStore.searchSymptoms(queryEmbedding, searchOptions);
      } else if (options.searchType === 'treatments') {
        searchResult = await this.vectorStore.searchTreatments(queryEmbedding, searchOptions);
      } else if (options.searchType === 'diagnosis') {
        searchResult = await this.vectorStore.searchDiagnosis(queryEmbedding, searchOptions);
      } else if (options.searchType === 'emergency') {
        searchResult = await this.vectorStore.searchEmergency(queryEmbedding, searchOptions);
      } else if (options.keywords) {
        searchResult = await this.vectorStore.hybridSearch(queryEmbedding, options.keywords, searchOptions);
      } else {
        searchResult = await this.vectorStore.queryVectors(queryEmbedding, searchOptions);
      }

      // 3. Format and return results
      const formattedResults = this.formatSearchResults(searchResult, question);
      
      console.log(`✅ Query completed: ${formattedResults.matches.length} results in ${searchResult.queryTime}ms`);
      
      return formattedResults;

    } catch (error) {
      console.error(`❌ Query failed: ${error.message}`);
      throw error;
    }
  }

  // 📊 Format search results for consumption
  formatSearchResults(searchResult, originalQuery) {
    const matches = searchResult.matches.map(match => ({
      id: match.id,
      score: match.score,
      text: match.metadata?.text || '',
      source: match.metadata?.source || 'unknown',
      metadata: {
        documentType: match.metadata?.documentType,
        medicalSpecialty: match.metadata?.medicalSpecialty,
        hasSymptoms: match.metadata?.hasSymptoms,
        hasTreatment: match.metadata?.hasTreatment,
        hasDiagnosis: match.metadata?.hasDiagnosis,
        severity: match.metadata?.severity,
        bodyParts: match.metadata?.bodyParts,
        chunkIndex: match.metadata?.chunkIndex
      }
    }));

    return {
      query: originalQuery,
      matches,
      totalResults: searchResult.totalResults,
      queryTime: searchResult.queryTime,
      searchType: searchResult.searchType || 'semantic',
      context: this.buildRAGContext(matches)
    };
  }

  // 🧠 Build context for RAG generation
  buildRAGContext(matches) {
    const relevantChunks = matches
      .filter(match => match.score > 0.7) // Only highly relevant chunks
      .slice(0, 5) // Limit context size
      .map(match => match.text);

    return {
      chunks: relevantChunks,
      totalChunks: relevantChunks.length,
      context: relevantChunks.join('\n\n--- \n\n')
    };
  }

  // 📊 Get pipeline statistics
  async getStats() {
    const vectorStats = await this.vectorStore.getStats();
    const embeddingInfo = this.embeddings.getModelInfo();
    
    return {
      pipeline: this.processingStats,
      embeddings: embeddingInfo,
      vectorStore: vectorStats,
      configuration: {
        embeddingModel: this.embeddingModel,
        chunkingStrategy: this.chunkingStrategy,
        indexName: this.indexName,
        namespace: this.namespace
      }
    };
  }

  // 📝 Log ingestion results
  logIngestionResults() {
    console.log('\n🎉 Medical RAG Ingestion Complete!');
    console.log('═'.repeat(50));
    console.log(`📚 Documents processed: ${this.processingStats.documentsProcessed}`);
    console.log(`✂️  Chunks created: ${this.processingStats.chunksCreated}`);
    console.log(`📤 Vectors upserted: ${this.processingStats.vectorsUpserted}`);
    console.log(`⏱️  Processing time: ${(this.processingStats.processingTime / 1000).toFixed(2)}s`);
    console.log(`❌ Errors: ${this.processingStats.errors.length}`);
    
    if (this.processingStats.errors.length > 0) {
      console.log('\n⚠️ Errors encountered:');
      this.processingStats.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error.step}: ${error.error}`);
      });
    }
    
    const chunker = this.chunker;
    if (this.processingStats.chunksCreated > 0) {
      console.log(`\n📊 Average chunk size: ${Math.round(this.processingStats.chunksCreated / this.processingStats.documentsProcessed)} chunks/doc`);
    }
    
    console.log('═'.repeat(50));
  }

  // 🧹 Cleanup pipeline resources
  cleanup() {
    this.embeddings.cleanup();
    this.vectorStore.cleanup();
    this.isInitialized = false;
    console.log('🧹 RAG Pipeline cleaned up');
  }
}

export default MedicalRAGPipeline;