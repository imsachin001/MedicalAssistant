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
const BATCH_SIZE = 40; // adjust depending on your system
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

// 3. Function to embed text into vectors
async function embedText(text) {
  const result = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(result.data); // tensor -> JS array
}

// 4. Function to split text semantically
function smartChunk(text, chunkSize = 800, overlap = 100) {
  // First split by paragraphs
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  const chunks = [];
  for (const para of paragraphs) {
    if (para.length <= chunkSize) {
      chunks.push(para);
    } else {
      // If too big, further split into sentences
      const sentences = para.split(/(?<=[.?!])\s+/);
      let current = "";

      for (const sentence of sentences) {
        if ((current + sentence).length > chunkSize) {
          chunks.push(current.trim());
          current = sentence;
        } else {
          current += " " + sentence;
        }
      }
      if (current.trim()) chunks.push(current.trim());
    }
  }

  // Apply overlap between chunks
  const overlapped = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (i > 0) {
      const overlapText = chunks[i - 1].slice(-overlap);
      overlapped.push(overlapText + " " + chunk);
    } else {
      overlapped.push(chunk);
    }
  }

  return overlapped;
}

// 5. Ingestion pipeline
async function ingest() {
  console.log(">>> Running improved ingest.js");

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

    // Extract text + pages
    const text = pdfData.text;

    // Split into semantic chunks
    const chunks = smartChunk(text);
    console.log(`📄 ${pdfFile}: split into ${chunks.length} semantic chunks`);

    // ✅ Embed + upsert in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      const vectors = await Promise.all(
        batch.map(async (chunk, idx) => {
          const vector = await embedText(chunk);
          return {
            id: `${pdfFile}-${i + idx}`,
            values: vector,
            metadata: {
              text: chunk,
              source: pdfFile,
              chunkIndex: i + idx,
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

  console.log("🎉 All PDFs have been semantically ingested into Pinecone!");
}

ingest().catch(err => console.error("❌ Error in ingestion:", err));
