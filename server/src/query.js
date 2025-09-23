import "dotenv/config";
import { Pinecone } from "@pinecone-database/pinecone";

// -------- CONFIG --------
const indexName = "medical-knowledge";
const OLLAMA_MODEL = "gemma3:1b"; 
// ------------------------

// 1. Init Pinecone client
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index(indexName);

// 2. Load embedding model
import { pipeline } from "@xenova/transformers";
let extractor;
async function getExtractor() {
  if (!extractor) {
    console.log("⏳ Loading embedding model...");
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("✅ Embedding model loaded");
  }
  return extractor;
}

// Helper: embed text
async function embedText(text) {
  const ext = await getExtractor();
  const result = await ext(text, { pooling: "mean", normalize: true });
  return Array.from(result.data);
}

// 3. Query Pinecone
export async function queryPinecone(query, topK = 10) {
  const queryVector = await embedText(query);
  return await index.query({
    topK,
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
      stream: false,
    }),
    signal: AbortSignal.timeout(300000)
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response.trim();
}

// 5. Semantic similarity
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Reformulate follow-up queries
function reformulateQuery(message, history) {
  if (!history || history.length === 0) return message;
  const lastUser = [...history].reverse().find(m => m.role === 'user');
  if (lastUser && message.split(' ').length < 6) {
    return `${lastUser.text} -> ${message}`;
  }
  return message;
}

// NEW: Detect question intent
function detectIntent(message) {
  const lower = message.toLowerCase();
  if (lower.includes("symptom") || lower.includes("sign")) return "symptoms";
  if (lower.includes("treatment") || lower.includes("cure") || lower.includes("medicine")) return "treatment";
  if (lower.includes("food") || lower.includes("diet") || lower.includes("nutrition")) return "food";
  if (lower.includes("suggest") || lower.includes("advice") || lower.includes("recommend")) return "suggestions";
  return "general";
}

export async function generateAnswer({ message, history }, contextChunks) {
  console.log("\n[DEBUG] Retrieved context chunks:");
  contextChunks.forEach((c, i) => {
    console.log(`Chunk ${i + 1}:\n${c.metadata.text}\n---`);
  });

  const reformulated = reformulateQuery(message, history);
  const queryVec = await embedText(reformulated);

  // Rerank
  let reranked = contextChunks.map(chunk => {
    const text = chunk.metadata.text || '';
    return { ...chunk, _score: cosineSimilarity(queryVec, chunk.values || queryVec) };
  });

  reranked.sort((a, b) => b._score - a._score);

  let filteredChunks = reranked.slice(0, 5);

  const context = filteredChunks.map((c, i) => `# Context ${i + 1}:\n${c.metadata.text}`).join("\n\n");

  // Detect intent
  const intent = detectIntent(message);

  const sectionInstruction = {
    symptoms: "Only list the SYMPTOMS related to the disease. Do not include treatments, food, or suggestions.",
    treatment: "Only provide the TREATMENTS (medical, lifestyle, therapies). Do not include symptoms or food advice.",
    food: "Only provide FOODS to eat and FOODS to avoid for this condition. Do not include symptoms or treatments.",
    suggestions: "Only provide general HEALTH SUGGESTIONS and advice. Do not include symptoms, treatments, or food.",
    general: "Provide a balanced medical answer using symptoms, treatments, foods, and suggestions if relevant."
  };

  const historyText = Array.isArray(history) && history.length > 0
    ? history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n') + `\nUser: ${message}`
    : `User: ${message}`;

    // Detect which section(s) the user is asking for
    function detectSections(msg) {
      const lower = msg.toLowerCase();
      const sections = [];
      if (/symptom/.test(lower)) sections.push('symptoms');
      if (/treat(ment|ing|ed)/.test(lower)) sections.push('treatments');
      if (/caus(e|es|ed)/.test(lower)) sections.push('causes');
      if (/doctor|see a doctor|consult/.test(lower)) sections.push('when_to_see_doctor');
      if (/food|diet|eat|avoid/.test(lower)) sections.push('food');
      if (/exercise|physical activity|workout|yoga/.test(lower)) sections.push('exercise');
      // If nothing matched, allow a general conversational response
      if (sections.length === 0) sections.push('message');
      return sections;
    }

    const requestedSections = detectSections(message);

    // Build JSON format string for prompt
    let jsonFormat = '{\n';
    if (requestedSections.includes('overview')) jsonFormat += '  "overview": "..."';
    if (requestedSections.includes('symptoms')) jsonFormat += (jsonFormat.length > 2 ? ',\n' : '') + '  "symptoms": ["..."]';
    if (requestedSections.includes('causes')) jsonFormat += (jsonFormat.length > 2 ? ',\n' : '') + '  "causes": ["..."]';
    if (requestedSections.includes('treatments')) jsonFormat += (jsonFormat.length > 2 ? ',\n' : '') + '  "treatments": ["..."]';
    if (requestedSections.includes('when_to_see_doctor')) jsonFormat += (jsonFormat.length > 2 ? ',\n' : '') + '  "when_to_see_doctor": ["..."]';
    if (requestedSections.includes('food')) jsonFormat += (jsonFormat.length > 2 ? ',\n' : '') + '  "food": ["..."]';
    if (requestedSections.includes('exercise')) jsonFormat += (jsonFormat.length > 2 ? ',\n' : '') + '  "exercise": ["..."]';
    if (requestedSections.includes('message')) jsonFormat += (jsonFormat.length > 2 ? ',\n' : '') + '  "message": "..."';
    jsonFormat += '\n}';

    const prompt = `
  You are a helpful and knowledgeable medical AI assistant.
  Your response MUST be valid JSON in the following format:
  ${jsonFormat}

  Food and exercise must always be separate fields. Never mix food and exercise in the same array or field.
  For food, provide at least 3-5 specific items (e.g., foods to eat or avoid) if possible.
  For exercise, provide at least 3-5 specific types of exercise, including yoga asanas or physical activities if relevant. List them as separate items (e.g., "Brisk walking", "Cycling", "Surya Namaskar (yoga)", "Swimming", "Jogging").
  If a section is not relevant or information is missing, return an empty array or an empty string for that section.

  User intent: ${intent}

  Your task is to answer user questions using the context provided below. Prefer the context, but if it does not contain enough information, you may use your own medical knowledge to provide a complete answer. If you use your own knowledge, clearly indicate which parts are from your internal knowledge.

  Guidelines:
  - Only answer the specific section(s) requested by the user (e.g., symptoms, treatments, causes, food, exercise, etc.).
  - Use bullet points (array of strings) for each section.
  - Never mix food and exercise in the same field.
  - If the user's question is a general or conversational follow-up (e.g., "Are these correct?", "Is this true?", "Can you confirm?"), respond naturally in the 'message' field with a conversational answer (e.g., "Yes, those are correct symptoms.").
  - Focus first on the relevant information from the context.
  - If the context is insufficient, supplement with your own medical knowledge and clearly mark those parts.
  - Ignore unrelated side effects, lab procedures, or non-medical details.
  - Be concise, medically accurate, and avoid unnecessary repetition.

  Conversation so far:
  ${historyText}

  Context:
  ${context}

  Respond ONLY with the JSON object described above. Do not include any extra text or explanation.
  `;

    console.log("⏳ Asking Ollama model (structured JSON):", OLLAMA_MODEL);
    const raw = await queryOllama(prompt);

    // Try to parse JSON from LLM output
    let parsed = null;
    try {
      const jsonStart = raw.indexOf('{');
      const jsonEnd = raw.lastIndexOf('}') + 1;
      parsed = JSON.parse(raw.slice(jsonStart, jsonEnd));
    } catch (e) {
      console.error('[ERROR] Failed to parse LLM JSON output:', e, '\nRaw output:', raw);
      // fallback: return as plain text
      parsed = { overview: '', symptoms: [], causes: [], treatments: [], when_to_see_doctor: [], raw };
    }
    return parsed;

  console.log("⏳ Asking Ollama model:", OLLAMA_MODEL);
  return await queryOllama(prompt);
}

// 6. Main
if (process.argv[1] === new URL(import.meta.url).pathname) {
  (async () => {
    const question = "What are the symptoms of pneumonia?";
    console.log("🔎 Querying for:", question);

    const results = await queryPinecone(question);
    const chunks = results.matches || [];

    console.log(`📑 Retrieved ${chunks.length} relevant chunks from Pinecone.`);

    const finalAnswer = await generateAnswer({ message: question, history: [] }, chunks);
    console.log("\n💡 Final Answer:\n", finalAnswer);
  })().catch(err => console.error(err));
}
