import { ChatSevices } from '../services/chat_services.js';

export const ChatController = {
	query: async (req, res) => {
		try {
			const { messages } = req.body;
			const result = await ChatSevices.query(messages);
			res.status(200).json({ result });
		} catch (error) {
			console.error('Erro no controller:', error);
			res.status(500).json({ error: 'Erro ao processar o arquivo' });
		}
	},
};
