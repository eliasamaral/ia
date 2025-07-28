import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "langchain/document";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { qdrantClient as client } from "./../database/qdrant/client.js";

const EMBED_MODEL = process.env.OPENIA_EMBED_MODEL;
const OPENAI_AI = process.env.OPENAI_API_KEY;

const COLLECTION_NAME = "filesRAG";

const embeddings = new OpenAIEmbeddings({
	apiKey: OPENAI_AI,
	batchSize: 2048,
	model: EMBED_MODEL,
});

const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
	url: process.env.QDRANT_URL,
	collectionName: COLLECTION_NAME,
});

const splitter = new RecursiveCharacterTextSplitter({
	chunkSize: 5000,
	chunkOverlap: 200,
	separators: ["\n\n", "\n"],
});

async function ensureCollectionExists() {
	const aliases = await client.getCollectionAliases(COLLECTION_NAME);

	if (!aliases || aliases.length === 0) {
		console.log(`Criando coleção ${COLLECTION_NAME}...`);
		await client.createCollection(COLLECTION_NAME, {
			vectors: { size: 2048, distance: "Cosine" },
		});
	}
}

async function createBlob(buffer, type) {
	return new Blob([buffer], { type });
}

async function loadPDFDocument(blob) {
	const loader = new WebPDFLoader(blob, {
		splitPages: false,
	});
	return loader.load();
}

async function loadTextDocument(blob) {
	const loader = new TextLoader(blob);
	return loader.load();
}

export const RAGFileService = {
	newFile: async ({ group, name, content }) => {
		await ensureCollectionExists();

		try {
			let doc;
			const blob = await createBlob(content.buffer, content.mimetype);

			switch (content.mimetype) {
				case "application/pdf":
					doc = await loadPDFDocument(blob);
					break;

				case "text/plain":
					doc = await loadTextDocument(blob);
					break;

				default:
					throw new Error(`Tipo de arquivo não suportado: ${content.mimetype}`);
			}

			const allSplits = await splitter.splitDocuments([
				new Document({
					pageContent: doc[0].pageContent,
					metadata: { group, name, createdAt: new Date() },
				}),
			]);
			await vectorStore.addDocuments(allSplits);
			return vectorStore;
		} catch (error) {
			console.error(error);
			throw error;
		}
	},
};
