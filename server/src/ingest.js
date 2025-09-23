import "dotenv/config";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { pipeline } from "@xenova/transformers";
import { Pinecone } from "@pinecone-database/pinecone";

// ----------- CONFIG -----------------
const __dirname = path.resolve();
const docsFolder = path.join(__dirname, "docs");
const indexName = "medical-knowledge"; // must exist in Pinecone
const BATCH_SIZE = 50;
// ------------------------------------

// 1. Init Pinecone client
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
const index = pc.index(indexName);

// 2. Load Hugging Face embedding model
console.log("⏳ Loading embedding model...");
const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
console.log("✅ Model loaded");

// 3. Embed text into vectors
async function embedText(text) {
  const result = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(result.data);
}

// 4. Simple text splitter (can be improved later)
function smartChunk(text, chunkSize = 800) {
  const sentences = text.split(/(?<=[.?!])\s+/);
  let current = "";
  const chunks = [];

  for (const sentence of sentences) {
    if ((current + sentence).length > chunkSize) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += " " + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// 5. Extract disease name + section from chunk text
function classifyChunk(chunk) {
  const lower = chunk.toLowerCase();
  let section = "general";

  if (lower.includes("symptom") || lower.includes("sign")) {
    section = "symptoms";
  } else if (lower.includes("treatment") || lower.includes("therapy") || lower.includes("management")) {
    section = "treatments";
  } else if (lower.includes("food") || lower.includes("diet") || lower.includes("nutrition")) {
    section = "food";
  } else if (lower.includes("advice") || lower.includes("suggest") || lower.includes("recommend")) {
    section = "suggestions";
  }

  // naive disease name extraction (first capitalized word)
  const match = chunk.match(/\b([A-Z][a-z]+)\b/);
  const disease = match ? match[1] : "Unknown";

  return { disease, section };
}

// 6. Ingestion pipeline
async function ingest() {
  console.log(">>> Running structured ingest.js");

  let pdfFiles = [];
  try {
    pdfFiles = fs.readdirSync(docsFolder).filter(f => f.endsWith(".pdf"));
  } catch (err) {
    console.error("[ERROR] Cannot read docs folder:", docsFolder, err);
    return;
  }

  if (pdfFiles.length === 0) {
    console.error("❌ No PDF files found in docs/");
    return;
  }

  for (const pdfFile of pdfFiles) {
    const pdfPath = path.join(docsFolder, pdfFile);
    console.log(`[DEBUG] Reading PDF: ${pdfPath}`);

    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer);

    const chunks = smartChunk(pdfData.text);
    console.log(`📄 ${pdfFile}: split into ${chunks.length} semantic chunks`);

    // ✅ Embed + upsert in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      const vectors = await Promise.all(
        batch.map(async (chunk, idx) => {
          const { disease, section } = classifyChunk(chunk);
          const vector = await embedText(chunk);

          return {
            id: `${pdfFile}-${i + idx}`,
            values: vector,
            metadata: {
              text: chunk,
              source: pdfFile,
              chunkIndex: i + idx,
              disease,
              section, // 👈 NEW: symptoms / treatments / food / suggestions
            },
          };
        })
      );

      await index.upsert(vectors);
      console.log(
        `   ✅ Uploaded batch ${i / BATCH_SIZE + 1} (${i + 1}–${i + batch.length}/${chunks.length})`
      );
    }
  }

  console.log("🎉 Structured ingestion complete!");
}

ingest().catch(err => console.error("❌ Error in ingestion:", err));
