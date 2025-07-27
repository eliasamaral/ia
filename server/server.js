import express from "express";
import cors from "cors";
import RAGRoutes from "./routes/RAG_file.js";
const app = express();

const PORT = 3001;

app.use(express.json());
app.use(
	cors({
		origin: "http://app:8080",
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"]
	}),
);
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});
app.use("/api/rag", RAGRoutes);

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
