import { RAGFileService } from "../services/RAG_file_service.js";
import { signedUrl } from "../services/r2Service.js";

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

			const data = {
				group: req.body.group,
				name: req.file.originalname,
				content: req.file,
			};

			const result = await RAGFileService.newFile(data);

			const { url } = await signedUrl(data.name, req.file.mimetype);

			res.status(200).json({
				message: "Arquivo processado com sucesso!",
				//filePath: result,
				url,
			});
		} catch (error) {
			console.error("Erro no controller:", error);
			res.status(500).json({ error: error.message });
		}
	},
};
