import express from "express";
import cors from "cors";
import RAGRoutes from "./routes/RAG_file.js";
const app = express();

const PORT = process.env.PORT;

app.use(express.json());
app.use(
	cors({
		origin: "http://frontend:8080",
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"]
	}),
);
app.get("/", async (req, res) => {
	res.status(500).json({ hello: "word" });
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
