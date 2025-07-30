//import { signedUrl } from "../services/r2Service.js";
import { randomUUID } from "node:crypto";
import { RAGFileService } from "../services/RAG_file_service.js";

export const RAGFileController = {
	newRAGFile: async (req, res) => {
		try {
			if (!req.file) {
				throw new Error("Nenhum arquivo enviado.");
			}

			const allowedMimeTypes = ["text/plain", "application/pdf"];

			if (!allowedMimeTypes.includes(req.file.mimetype)) {
				throw new Error("Tipo de arquivo não é permitido.");
			}

			const metadata = {
				name: req.file.originalname,
				documentReference: randomUUID(),
				extension: req.file.originalname.split(".").pop(),
				content: req.file,
			};

			await RAGFileService.newFile(metadata);

			//const { url } = await signedUrl(metadata.name, req.file.mimetype);

			res.status(200).json({
				message: "Arquivo processado com sucesso!",
				//filePath: result,
				//url,
			});
		} catch (error) {
			console.error("Erro no controller:", error);
			res.status(500).json({ error: error.message });
		}
	},

	getAllFiles: async (req, res) => {
		try {
			const files = await RAGFileService.getAllFiles();
			res.status(200).json(files);
		} catch (error) {
			console.error("Erro ao obter arquivos:", error);
			res.status(500).json({ error: error.message });
		}
	}
};
