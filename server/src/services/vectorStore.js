import { PineconeClient } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import dotenv from 'dotenv';
dotenv.config();

export async function getRelevantChunks(query) {
	const pc = new PineconeClient();
	await pc.init({
		apiKey: process.env.PINECONE_API_KEY,
		environment: process.env.PINECONE_ENV,
	});
	const index = pc.Index(process.env.PINECONE_INDEX);

	const embeddings = new OpenAIEmbeddings({ apiKey: process.env.OPENAI_API_KEY });
	const queryEmbedding = await embeddings.embedQuery(query);

	// Query Pinecone for top 5 relevant chunks
	const results = await index.query({
		topK: 5,
		vector: queryEmbedding,
		includeMetadata: true,
	});
	// Return the text of the top chunks
	return results.matches.map(match => match.metadata.text);
}
