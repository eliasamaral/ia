import express from 'express';
import multer from 'multer';
import { ChatController } from '../controllers/chat_controllers.js';
import { RAGFileController } from '../controllers/RAG_file_controllers.js';

const upload = multer({
	storage: multer.memoryStorage(),
});
const router = express.Router();

router.post('/upload', upload.single('file'), RAGFileController.newRAGFile);
router.post('/chat', ChatController.query);

export default router;
