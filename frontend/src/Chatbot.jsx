import { useEffect, useState, useRef } from "react";
import axios from "axios";

import { Send, Loader, BotMessageSquare, UserRound } from "lucide-react";
import "./Chatbot.css";

const scrollStyle = {
	scrollBehavior: "smooth",
};

const LOCAL_STORAGE_KEY = "chat_messages";

export default function Chatbot() {
	const [messages, setMessages] = useState([]);
	const [loading, setLoading] = useState(false);
	const [input, setInput] = useState("");
	const chatEndRef = useRef(null);
	const inputRef = useRef(null);

	useEffect(() => {
		const storedMessages =
			JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
		setMessages(storedMessages);
	}, []);
	useEffect(() => {
		localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
		chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
		inputRef.current?.focus();
	}, [messages]);

	const sendMessage = async (e) => {
		e.preventDefault();

		if (!input.trim()) return;

		const newUserMessage = { role: "user", content: input };
		const updatedMessages = [...messages, newUserMessage];
		setMessages(updatedMessages);
		setInput("");

		setLoading(true);

		try {
			const response = await axios.post(
				"/api/rag/chat",
				{
					messages: input,
				},
				{ withCredentials: true },
			);

			const botMessage = {
				role: "assistant",
				content: response.data.result.result,
			};

			setMessages((prev) => [...prev, botMessage]);
		} catch (error) {
			console.error("Erro ao consultar o bot:", error);
		} finally {
			setLoading(false);
		}
	};
	return (
		<div className="flex flex-row justify-between w-screen h-screen bg-white p-2 shadow-md overflow-hidden">
			<div className="not-lg:hidden">shjshh</div>
			<div className="flex flex-col ">
				<div className="bg-gray-50 text-black p-4 font-medium flex items-center rounded-t-lg border border-gray-200 justify-between">
					<span>GPeTo</span>
				</div>

				<div
					className="flex-1 overflow-y-auto bg-white border-x border-gray-200"
					style={scrollStyle}
				>
					{messages.map((msg, idx) => (
						<div
							key={idx}
							className={`flex my-10 px-4 md:px-10 gap-3 text-sm text-zinc-600 ${
								msg.role === "assistant" ? "justify-start" : "bg-gray-100 p-5"
							}`}
						>
							<div className="flex items-center">
								{msg.role === "user" ? <UserRound /> : <BotMessageSquare />}
							</div>
							{msg.content}
						</div>
					))}
					<div ref={chatEndRef} />
				</div>

				<div>
					{loading && (
						<div className="flex justify-center p-2">
							<Loader className="animate-spin text-blue-500" size={24} />
						</div>
					)}
				</div>

				<div className="flex justify-center p-2 italic text-sm border-x border-gray-200 bg-gray-100">
					Esta é uma aplicação em desenvolvimento. Por favor, revise as
					informações.
				</div>

				<div className="border border-gray-200 p-4 bg-white rounded-b-lg">
					<form onSubmit={sendMessage} className="flex items-center">
						<input
							ref={inputRef}
							disabled={loading}
							type="text"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							placeholder="Digite sua mensagem"
							className="flex-1 border border-gray-300 rounded-l-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						<button
							type="submit"
							disabled={loading}
							className="bg-blue-600 hover:bg-blue-700 text-white rounded-r-full p-2 focus:outline-none"
						>
							<Send size={20} />
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
