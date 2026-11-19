// query.js
import "dotenv/config";
import { Pinecone } from "@pinecone-database/pinecone";
import { pipeline } from "@xenova/transformers";

// -------- CONFIG ----------
const INDEX_NAME = "medical-knowledge";
const OLLAMA_MEDICAL = process.env.OLLAMA_MEDICAL_MODEL || "gemma3:1b";
const OLLAMA_FALLBACK = process.env.OLLAMA_FALLBACK_MODEL || "phi3";
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const TOPK = 8;
const RELEVANCE_THRESHOLD = 0.20; // semantic threshold for "relevant" (tuneable)
// ---------------------------

// Init Pinecone client
const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
const index = pc.index(INDEX_NAME);

// Xenova extractor lazy-load
let extractor = null;
async function getExtractor() {
  if (!extractor) {
    console.log("⏳ Loading Xenova embedding model...");
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("✅ Embedding model loaded");
  }
  return extractor;
}

export async function embedText(text) {
  const ext = await getExtractor();
  const res = await ext(text, { pooling: "mean", normalize: true });
  return Array.from(res.data);
}

function cosineSimilarity(a = [], b = []) {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function queryOllama(prompt, model = OLLAMA_MEDICAL) {
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false }),
    signal: AbortSignal.timeout(300000)
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return data.response?.trim() ?? "";
}

// Basic intent detection (simple keywords)
export function detectIntent(message = "") {
  const lower = (message || "").toLowerCase();
  if (/\b(symptom|sign|present|presenting)\b/.test(lower)) return "symptoms";
  if (/\b(treat|therapy|management|medication|drug|medicine|cure)\b/.test(lower)) return "treatments";
  if (/\b(food|diet|eat|avoid|nutrition)\b/.test(lower)) return "food";
  if (/\b(suggest|advice|should i|what should i)\b/.test(lower)) return "suggestions";
  if (/\b(cause|risk|etiology)\b/.test(lower)) return "causes";
  if (/\b(doctor|see a doctor|consult)\b/.test(lower)) return "when_to_see_doctor";
  // greetings/followups -> message (non-structured conversational)
  if (/^(hi|hello|hey|thanks|thank you|are these|is this|is that|is it|can you|please)/i.test(lower)) return "message";
  return "general";
}

// Detect which structured sections user likely wants
function detectSections(message = "") {
  const lower = (message || "").toLowerCase();
  const sections = [];
  if (/\b(symptom|sign|present)\b/.test(lower)) sections.push("symptoms");
  if (/\b(treat|therapy|manage|medication)\b/.test(lower)) sections.push("treatments");
  if (/\b(food|diet|nutrition|eat|avoid)\b/.test(lower)) sections.push("food");
  if (/\b(cause|risk|etiology)\b/.test(lower)) sections.push("causes");
  if (/\b(doctor|see a doctor|consult)\b/.test(lower)) sections.push("when_to_see_doctor");
  if (sections.length === 0) sections.push("message");
  return sections;
}

/**
 * Retrieve relevant chunks from Pinecone.
 * If an intent (section) is passed, we apply a metadata filter { section: intent }.
 * Returns { matches, maxScore }.
 */
export async function getRelevantChunks(query, intent = null, topK = TOPK) {
  const qvec = await embedText(query);
  const filter = intent && intent !== "general" && intent !== "message" ? { section: intent } : undefined;

  const res = await index.query({
    vector: qvec,
    topK,
    includeMetadata: true,
    filter
  });

  const matches = (res?.matches || []).map(m => {
    // Normalize representation: some clients return score or values
    return {
      id: m.id,
      score: typeof m.score === "number" ? m.score : null,
      values: m.values || m.vector || null,
      metadata: m.metadata || {}
    };
  });

  // compute semantic similarity (if values present)
  let maxScore = 0;
  for (const m of matches) {
    if (m.values && Array.isArray(m.values)) {
      const sim = cosineSimilarity(qvec, m.values);
      if (sim > maxScore) maxScore = sim;
      m._sim = sim;
    } else {
      m._sim = m.score ?? 0;
      if (m._sim > maxScore) maxScore = m._sim;
    }
  }

  return { matches, maxScore, qvec };
}

/**
 * Main generator function for medical answers.
 * - Expects the caller to pass relevant context chunks (or let it fetch them).
 * - Returns an object:
 *    { ok: true, type: 'medical', structured: <object>, message: <string> }
 *    OR { ok: false, reason: 'no_context'|'redirect'|'parse_error', raw: <string> }
 */
export async function generateAnswer({ message, history = [] }, contextChunks = []) {
  try {
    // If no context was passed, try to retrieve it automatically w/o filter
    if (!contextChunks || contextChunks.length === 0) {
      const { matches, maxScore } = await getRelevantChunks(message, null, TOPK);
      contextChunks = matches;
      // if below threshold, we treat as no context (caller can fallback)
      if (maxScore < RELEVANCE_THRESHOLD) {
        return { ok: false, reason: "no_context", raw: null };
      }
    }

    // Reformulate short follow-up queries using last user message in history
    if (history && history.length > 0 && message.split(" ").length < 6) {
      const lastUser = [...history].reverse().find(m => m.role === "user");
      if (lastUser) message = `${lastUser.text} -> ${message}`;
    }

    // Determine requested sections / intent
    const intent = detectIntent(message);
    const sections = detectSections(message); // e.g., ['symptoms'] or ['message']

    // Try to prefer chunks with metadata.section matching requested sections
    let preferred = contextChunks.filter(c => c.metadata && sections.some(s => (c.metadata.section || "").toLowerCase().includes(s)));
    if (preferred.length === 0) {
      // fallback to top-n by semantic sim
      preferred = contextChunks.slice(0, Math.min(5, contextChunks.length));
    } else {
      preferred = preferred.slice(0, Math.min(6, preferred.length));
    }

    // Build context text (cleaned)
    const contextText = preferred.map((c, i) => {
      const meta = c.metadata || {};
      const head = meta.disease ? `${meta.disease} (${meta.section || "general"})` : `${meta.section || "general"}`;
      return `#Context ${i + 1} - ${head}:\n${meta.text || ""}`;
    }).join("\n\n");

    // Build JSON schema string if structured sections are requested
    const requestedStructured = sections.some(s => ["symptoms", "treatments", "food", "causes", "when_to_see_doctor", "exercise"].includes(s));
    let jsonSchema = '{\n';
    const parts = [];
    if (sections.includes("symptoms")) parts.push('  "symptoms": ["..."]');
    if (sections.includes("treatments")) parts.push('  "treatments": ["..."]');
    if (sections.includes("food")) parts.push('  "food": {"eat": ["..."], "avoid": ["..."]}');
    if (sections.includes("causes")) parts.push('  "causes": ["..."]');
    if (sections.includes("when_to_see_doctor")) parts.push('  "when_to_see_doctor": ["..."]');
    if (sections.includes("exercise")) parts.push('  "exercise": ["..."]');
    if (sections.includes("message")) parts.push('  "message": "..."');

    jsonSchema += parts.join(',\n') + '\n}';

    // Build prompt
    const promptLines = [];
    promptLines.push("You are a careful, conservative medical assistant.");
    promptLines.push("Follow instructions exactly.");
    promptLines.push(`User query (intent detection): ${intent}`);
    promptLines.push("");
    if (requestedStructured) {
      promptLines.push("Output FORMAT: Respond ONLY with valid JSON matching this schema (no extra commentary):");
      promptLines.push(jsonSchema);
      promptLines.push("");
      promptLines.push("Rules:");
      promptLines.push("- Use arrays of short strings for each bullet (each bullet max 1-2 sentences).");
      promptLines.push("- For 'food', separate 'eat' and 'avoid' lists as shown.");
      promptLines.push("- If a section is not relevant or not present in the context, return an empty array or empty object for that section.");
      promptLines.push("- If relying on knowledge outside the context, prefix the item with '[inferred] ' in the string.");
      promptLines.push("- Be concise and avoid repetition.");
    } else {
      promptLines.push("Output FORMAT: Provide a concise conversational answer (no JSON) limited to the user's request.");
      promptLines.push("- If it's a non-medical casual question (greeting/follow-up), respond naturally.");
      promptLines.push("- If the user asked a medical question and the context is insufficient, be conservative: say you don't have authoritative info and advise to consult a clinician.");
    }
    promptLines.push("");
    promptLines.push("Conversation history (most recent last):");
    if (history && Array.isArray(history) && history.length > 0) {
      const hist = history.slice(-6).map(h => `${h.role === "user" ? "User" : "Assistant"}: ${typeof h.text === "string" ? h.text : JSON.stringify(h.text)}`).join("\n");
      promptLines.push(hist);
    } else {
      promptLines.push(`User: ${message}`);
    }
    promptLines.push("");
    promptLines.push("Context (relevant documents):");
    promptLines.push(contextText || "No context available.");
    promptLines.push("");
    promptLines.push(`Now answer the user query: "${message}"`);
    promptLines.push("");
    const prompt = promptLines.join("\n");

    // Ask Ollama medical model
    const raw = await queryOllama(prompt, OLLAMA_MEDICAL);

    // Quick redirect detection (user-limited model message)
    const rawLower = (raw || "").toLowerCase();
    if (/i(?:'|’)?m here as your medical assistant|i (?:can'?t|cannot) help with that|i am only able to provide medical|i cannot provide non-medical|i only (?:specialize|focus)/i.test(rawLower)) {
      // medical model refused or redirected
      return { ok: false, reason: "redirect", raw };
    }

    // Try parse JSON if requestedStructured
    if (requestedStructured) {
      try {
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}") + 1;
        if (start !== -1 && end !== -1 && end > start) {
          const substr = raw.slice(start, end);
          const parsed = JSON.parse(substr);
          // If all fields empty, treat as no useful content
          const allEmpty = Object.values(parsed).every(v => {
            if (Array.isArray(v)) return v.length === 0;
            if (v && typeof v === "object") return Object.keys(v).length === 0;
            return v === "" || v === null || v === undefined;
          });
          if (allEmpty) {
            return { ok: false, reason: "empty_structured", raw };
          }
          return { ok: true, type: "medical", structured: parsed, message: JSON.stringify(parsed) };
        } else {
          // couldn't find JSON, return parse_error
          return { ok: false, reason: "parse_error", raw };
        }
      } catch (e) {
        return { ok: false, reason: "parse_error", raw };
      }
    }

    // Not structured -> return plain text answer
    return { ok: true, type: "text", message: raw };
  } catch (err) {
    console.error("[generateAnswer] error:", err);
    return { ok: false, reason: "exception", raw: err.message || String(err) };
  }
}

/** Fallback generator (general conversational model). 
 *  Use this when the medical model refuses/redirects or there's no context.
 *  Returns { ok: true, type: 'fallback', message: string }.
 */
export async function generateFallback({ message, history = [] }) {
  const hist = Array.isArray(history) ? history.slice(-6).map(h => `${h.role === "user" ? "User" : "Assistant"}: ${typeof h.text === "string" ? h.text : JSON.stringify(h.text)}`).join("\n") : "";
  const prompt = [
    "You are a friendly, conversational assistant. Answer naturally and helpfully.",
    "Do NOT give specialized medical advice — just be conversational or give general info.",
    "",
    "Conversation history:",
    hist,
    "",
    `User: ${message}`,
    "",
    "Answer conversationally in 1-3 short sentences."
  ].join("\n");
  try {
    const raw = await queryOllama(prompt, OLLAMA_FALLBACK);
    console.log("[Fallback model reply]", raw);
    return { ok: true, type: "fallback", message: raw || "I'm here to help! Please ask your question again." };
  } catch (e) {
    console.error("[generateFallback] error:", e);
    return { ok: true, type: "fallback", message: "I'm here to help! Please ask your question again." };
  }
}
