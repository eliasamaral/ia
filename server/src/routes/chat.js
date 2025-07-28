import express from "express";
import { ChatController } from "../controllers/chat_controllers.js";

const router = express.Router();

router.post("/", ChatController.query);

export default router;
