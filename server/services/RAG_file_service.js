import { qdrantClient as client } from "./../database/qdrant/client.js";
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { pull } from "langchain/hub";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";

const EMBED_MODEL = process.env.OPENIA_EMBED_MODEL;
const CHAT_MODEL = process.env.OPENIA_CHAT_MODEL;
const OPENAI_AI = process.env.OPENAI_API_KEY;
const COLLECTION_NAME = "filesRAG";

const embeddings = new OpenAIEmbeddings({
	apiKey: OPENAI_AI,
	batchSize: 2048,
	model: EMBED_MODEL,
});
const llm = new ChatOpenAI({
	model: CHAT_MODEL,
	temperature: 0,
	maxRetries: 2,
});

const promptTemplate = await pull("rlm/rag-prompt");

const generate = async (state) => {
	const docsContent = state.context.map((doc) => doc.pageContent).join("\n");

	const messages = await promptTemplate.invoke({
		question: state.question,
		context: docsContent,
	});
	const response = await llm.invoke(messages);
	return { answer: response.content };
};
const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
	url: process.env.QDRANT_URL,
	collectionName: COLLECTION_NAME,
});

const retrieve = async (state) => {
	const retrievedDocs = await vectorStore.similaritySearch(state.question);
	return { context: retrievedDocs };
};
const StateAnnotation = Annotation.Root({
	question: Annotation,
	context: Annotation,
	answer: Annotation,
});

const splitter = new RecursiveCharacterTextSplitter({
	chunkSize: 5000,
	chunkOverlap: 200,
	separators: ["\n\n", "\n"],
});

const graph = new StateGraph(StateAnnotation)
	.addNode("retrieve", retrieve)
	.addNode("generate", generate)
	.addEdge("__start__", "retrieve")
	.addEdge("retrieve", "generate")
	.addEdge("generate", "__end__")
	.compile();


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
