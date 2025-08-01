import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "langchain/document";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { qdrantClient as client } from "./../database/qdrant/client.js";
import { PrismaClient } from "../generated/prisma/client.js";

const prisma = new PrismaClient();

const EMBED_MODEL = process.env.OPENIA_EMBED_MODEL;
const OPENAI_API = process.env.OPENAI_API_KEY;
const QDRANT_URL = process.env.QDRANT_URL;
const COLLECTION_NAME = "files";

const splitter = new RecursiveCharacterTextSplitter({
	chunkSize: 5000,
	chunkOverlap: 200,
	separators: ["\n\n", "\n"],
});

async function ensureCollectionExists() {
	const collections = await client.getCollections();
	const exists = collections.collections.some(
		(c) => c.name === COLLECTION_NAME,
	);

	if (!exists) {
		console.log(`Criando coleção ${COLLECTION_NAME}...`);
		await client.createCollection(COLLECTION_NAME, {
			vectors: { size: 3072, distance: "Cosine" },
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
	newFile: async ({ name, documentReference, extension, content }) => {
		if (!content?.buffer || !content?.mimetype) {
			throw new Error("Arquivo inválido ou incompleto.");
		}

		await ensureCollectionExists();

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

		const fullText = doc.map((d) => d.pageContent).join("\n");

		const baseDoc = new Document({
			pageContent: fullText,
			metadata: {
				name,
				documentReference,
				createdAt: new Date(),
			},
		});

		const allSplits = await splitter.splitDocuments([baseDoc]);

		// Adiciona metadados extras em cada chunk
		allSplits.forEach((doc, idx) => {
			doc.metadata.chunkIndex = idx;
			doc.metadata.totalChunks = allSplits.length;
		});

		const embeddings = new OpenAIEmbeddings({
			apiKey: OPENAI_API,
			batchSize: 3072,
			model: EMBED_MODEL,
		});

		const vectorStore = await QdrantVectorStore.fromExistingCollection(
			embeddings,
			{
				url: QDRANT_URL,
				collectionName: COLLECTION_NAME,
			},
		);

		await vectorStore.addDocuments(allSplits);

		await prisma.file.create({
			data: {
				name,
				documentReference,
				extension,
			},
		});

		return { success: true, chunks: allSplits.length };
	},

	getAllFiles: async () => {
		return await prisma.file.findMany();
	},
};
