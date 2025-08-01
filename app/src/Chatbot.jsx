import axios from 'axios';
import {
  BotMessageSquare,
  Loader,
  Send,
  UploadCloud,
  UserRound,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import pdf from './assets/pdf.svg';
import './Chatbot.css';

const scrollStyle = {
  scrollBehavior: 'smooth',
};

const LOCAL_STORAGE_KEY = 'chat_messages';

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const [file, setFile] = useState(null); // <- arquivo único
  const [uploadedFiles, setUploadedFiles] = useState([]); // <- lista de arquivos no servidor
  const [isLoading, setIsLoading] = useState(false); // upload loading
  const [message, setMessage] = useState('');

  useEffect(() => {
    const storedMessages =
      JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
    setMessages(storedMessages);
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    inputRef.current?.focus();
  }, [messages]);

  useEffect(() => {
    async function fetchFiles() {
      try {
        const res = await fetch('http://localhost:3001/files');
        const data = await res.json();
        setUploadedFiles(data);
      } catch (err) {
        console.error('Erro ao carregar arquivos', err);
      }
    }

    fetchFiles();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:3001/files/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro no upload');
      }

      setMessage(data.message || 'Arquivo enviado com sucesso!');
      setUploadedFiles((prev) => [...prev, file]);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
      setFile(null);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!input.trim()) return;

    const newUserMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:3001/chat',
        {
          messages: input,
        },
      );

      const botMessage = {
        role: 'assistant',
        content: response.data.result.result,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Erro ao consultar o bot:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-row justify-between w-screen h-screen bg-white p-2 shadow-md overflow-hidden">
      <div className="not-lg:hidden">
        <div className="max-w-md space-y-4">
          <input
            type="file"
            onChange={handleFileChange}
            className="block w-full cursor-pointer rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-700 shadow-sm file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white hover:file:bg-blue-700"
          />

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || isLoading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            {isLoading ? 'Enviando...' : 'Enviar arquivo'}
          </button>

          {message && <p className="text-sm text-green-600">✅ {message}</p>}
        </div>

        <div className="file-grid mt-4">
          {uploadedFiles.map((file, index) => (
            <div key={index}>
              <div className="card-content">
                <div className="file-item">
                  <img src={pdf} alt="PDF" style={{ width: '100px' }} />
                  <div className="text-center">
                    <p className="file-name">{file.name}</p>
                    <p className="file-size">{file.size}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col flex-1">
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
                msg.role === 'assistant' ? 'justify-start' : 'bg-gray-100 p-5'
              }`}
            >
              <div className="flex items-center">
                {msg.role === 'user' ? <UserRound /> : <BotMessageSquare />}
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
