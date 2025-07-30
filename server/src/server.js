import cors from "cors";
import express from "express";
import ChatRoutes from "./routes/chat.js";
import RAGRoutes from "./routes/RAG_file.js";

const app = express();

const PORT = 3001;

app.use(express.json());
app.use(
	cors({
		origin: "*",
		methods: ["GET", "POST", "PUT", "DELETE"],
		allowedHeaders: ["Content-Type", "Authorization"],
	}),
);

app.use("/files", RAGRoutes);
app.use("/chat", ChatRoutes);

(async () => {
	try {
		app.listen(PORT, () => {
			console.log(`✅ Server running on http://localhost:${PORT}`);
		});
	} catch (err) {
		console.error("Erro ao iniciar o servidor:", err);
		process.exit(1);
	}
})();
