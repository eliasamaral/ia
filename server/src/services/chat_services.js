import { Annotation, StateGraph } from '@langchain/langgraph';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { pull } from 'langchain/hub';

const EMBED_MODEL = process.env.OPENIA_EMBED_MODEL;
const OPENAI_AI = process.env.OPENAI_API_KEY;
const CHAT_MODEL = process.env.OPENIA_CHAT_MODEL;
const COLLECTION_NAME = 'filesRAG';

const promptTemplate = await pull('rlm/rag-prompt');

const llm = new ChatOpenAI({
	model: CHAT_MODEL,
	temperature: 0,
	maxRetries: 2,
});

const embeddings = new OpenAIEmbeddings({
	apiKey: OPENAI_AI,
	batchSize: 2048,
	model: EMBED_MODEL,
});

const generate = async (state) => {
	const docsContent = state.context.map((doc) => doc.pageContent).join('\n');

	if (!docsContent.trim()) {
		return { answer: 'Não encontrei informações suficientes para responder.' };
	}

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

const graph = new StateGraph(StateAnnotation)
	.addNode('retrieve', retrieve)
	.addNode('generate', generate)
	.addEdge('__start__', 'retrieve')
	.addEdge('retrieve', 'generate')
	.addEdge('generate', '__end__')
	.compile();

export const ChatSevices = {
	query: async (messages) => {
		const inputs = { question: messages };

		const result = await graph.invoke(inputs);
		console.log('Chunk usados', result.context.length);

		return { result: result.answer };
	},
};
