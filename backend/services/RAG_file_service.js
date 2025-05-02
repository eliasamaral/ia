import { qdrantClient as client } from "./../database/qdrant/client.js";
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { pull } from "langchain/hub";
import { Annotation, StateGraph } from "@langchain/langgraph";

const EMBED_MODEL = process.env.OPENIA_EMBED_MODEL;
const CHAT_MODEL = process.env.OPENIA_CHAT_MODEL;
const OPENAI_AI = process.env.OPENAI_API_KEY;

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
	chunkSize: 1000,
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

const COLLECTION_NAME = "filesRAG";

async function ensureCollectionExists() {
	const aliases = await client.getCollectionAliases(COLLECTION_NAME);

	if (!aliases || aliases.length === 0) {
		console.log(`Criando coleção ${COLLECTION_NAME}...`);
		await client.createCollection(COLLECTION_NAME, {
			vectors: { size: 2048, distance: "Cosine" },
		});
	}
}

const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
	url: process.env.QDRANT_URL,
	collectionName: COLLECTION_NAME,
});

export const RAGFileService = {
	newFile: async ({ group, name, content }) => {
		if (!content || !content.length) {
			throw new Error("Conteúdo do arquivo e nome são obrigatórios.");
		}

		await ensureCollectionExists();

		try {
			const allSplits = await splitter.splitDocuments([
				new Document({
					pageContent: content,
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

	query: async (messages) => {
		const inputs = { question: messages };

		const result = await graph.invoke(inputs);
		console.log("Chunk usados", result.context.length);

		return { result: result.answer };
	},
};
