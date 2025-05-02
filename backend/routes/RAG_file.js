import express from "express";
import { RAGFileController } from "../controllers/RAG_file_controllers.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post("/upload", upload.single("file"), RAGFileController.newRAGFile);
router.post("/chat", RAGFileController.query);




export default router;
