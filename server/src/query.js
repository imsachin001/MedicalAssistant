import "dotenv/config";
import { Pinecone } from "@pinecone-database/pinecone";

// -------- CONFIG --------
const indexName = "medical-knowledge";
const OLLAMA_MODEL = "gemma3:4b"; // or "gemma:2b" if you try later
// ------------------------

// 1. Init Pinecone client
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index(indexName);

// 2. Load embedding model (same as ingest.js)
import { pipeline } from "@xenova/transformers";
console.log("⏳ Loading embedding model...");
const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
console.log("✅ Embedding model loaded");

// Helper: embed text
async function embedText(text) {
  const result = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(result.data);
}

// 3. Query Pinecone
async function queryPinecone(query) {
  const queryVector = await embedText(query);

  return await index.query({
    topK: 5,
    vector: queryVector,
    includeMetadata: true,
  });
}

// 4. Call Ollama locally
async function queryOllama(prompt) {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false, // we just want the full output at once
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response.trim();
}

// 5. Generate answer
async function generateAnswer(question, contextChunks) {
  const context = contextChunks.map(c => c.metadata.text).join("\n\n");

  const prompt = `
You are a knowledgeable and reliable medical assistant. 
Your task is to answer user questions using ONLY the context provided below. 
Do not invent information that is not supported by the context. 
If the context does not contain enough information, say "The context does not provide enough details to answer fully."

Guidelines:
- Focus only on the relevant information from the context.
- Ignore unrelated side effects, lab procedures, or non-medical details.
- Present the answer clearly, in well-structured sentences and bullet points.
- Be concise, medically accurate, and avoid unnecessary repetition.

Question: ${question}

Context:
${context}

Answer:
`;

  console.log("⏳ Asking Ollama model:", OLLAMA_MODEL);
  return await queryOllama(prompt);
}

// 6. Main
async function main() {
  const question = "How about now?";
  console.log("🔎 Querying for:", question);

  const results = await queryPinecone(question);
  const chunks = results.matches || [];

  console.log(`📑 Retrieved ${chunks.length} relevant chunks from Pinecone.`);

  const finalAnswer = await generateAnswer(question, chunks);
  console.log("\n💡 Final Answer:\n", finalAnswer);
}

main().catch(err => console.error(err));
