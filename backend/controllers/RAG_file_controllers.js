import { RAGFileService } from "../services/RAG_file_service.js";

export const RAGFileController = {
	newRAGFile: async (req, res) => {
		try {
			const data = {
				group: req.body.group,
				name: req.file.originalname,
				content: req.file.buffer.toString("utf-8"),
			};


			const result = await RAGFileService.newFile(data);

			res
				.status(200)
				.json({ message: "Arquivo processado com sucesso!", filePath: result });
		} catch (error) {
			console.error("Erro no controller:", error);
			res.status(500).json({ error: "Erro ao processar o arquivo" });
		}

	},

	query: async (req, res) => {
		try {
			const { messages } = req.body;
			const result = await RAGFileService.query(messages);
			res.status(200).json({ result });
		} catch (error) {
			console.error("Erro no controller:", error);
			res.status(500).json({ error: "Erro ao processar o arquivo" });
		}
	},
};
