'use client'
import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatHistory {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export default function ChatPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [model, setModel] = useState<any>(null);
    const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);

    useEffect(() => {
        const initAI = async () => {
            try {
                const response = await fetch('/api/drive/ai-search');
                const { apiKey } = await response.json();
                const genAI = new GoogleGenerativeAI(apiKey);

                const aiModel = genAI.getGenerativeModel({
                    model: "gemini-2.0-flash-exp",
                });

                const generationConfig = {
                    temperature: 1,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 8192,
                    responseMimeType: "text/plain",
                };

                setModel(aiModel.startChat({
                    generationConfig,
                    history: chatHistory,
                }));
            } catch (error) {
                console.error('Lỗi khởi tạo AI:', error);
                toast.error('Không thể kết nối với AI');
            }
        };
        initAI();
    }, [chatHistory]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !model || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setIsLoading(true);

        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        try {
            const newUserHistory: ChatHistory = {
                role: 'user',
                parts: [{ text: userMessage }]
            };
            setChatHistory(prev => [...prev, newUserHistory]);

            const result = await model.sendMessage(userMessage);
            const response = result.response.text();

            const newModelHistory: ChatHistory = {
                role: 'model',
                parts: [{ text: response }]
            };
            setChatHistory(prev => [...prev, newModelHistory]);

            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            console.error('Lỗi khi gửi tin nhắn:', error);
            toast.error('Lỗi khi gửi tin nhắn');
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoBack = () => {
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <button
                        onClick={handleGoBack}
                        className="group flex items-center gap-2 px-4 py-2 
                        text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white
                        bg-white dark:bg-gray-800 rounded-xl 
                        border border-gray-200 dark:border-gray-700 
                        shadow-sm hover:shadow transition-all duration-200"
                    >
                        <FontAwesomeIcon
                            icon={faArrowLeft}
                            className="group-hover:-translate-x-1 transition-transform"
                        />
                        <span className="font-medium">Quay lại trang chủ</span>
                    </button>

                    <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                        Chat AI
                    </h1>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                    <div className="flex-1 overflow-y-auto mb-4 max-h-[600px]">
                        <div className="space-y-4">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-xl p-4 ${message.role === 'user'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                            }`}
                                    >
                                        <ReactMarkdown
                                            className="prose dark:prose-invert max-w-none"
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                code({ inline, className, children, ...props }: {
                                                    inline?: boolean;
                                                    className?: string;
                                                    children?: React.ReactNode;
                                                }) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return !inline && match ? (
                                                        <SyntaxHighlighter
                                                            {...props}
                                                            style={atomDark}
                                                            language={match[1]}
                                                            PreTag="div"
                                                            className="rounded-lg"
                                                        >
                                                            {String(children).replace(/\n$/, '')}
                                                        </SyntaxHighlighter>
                                                    ) : (
                                                        <code {...props} className={className}>
                                                            {children}
                                                        </code>
                                                    );
                                                },
                                                // Tùy chỉnh các thẻ markdown khác
                                                p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                                                ul: ({ children }) => <ul className="list-disc pl-4 mb-4 last:mb-0">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-4 last:mb-0">{children}</ol>,
                                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                                a: ({ children, href }) => (
                                                    <a
                                                        href={href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-400 hover:text-blue-500 underline"
                                                    >
                                                        {children}
                                                    </a>
                                                ),
                                                blockquote: ({ children }) => (
                                                    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic">
                                                        {children}
                                                    </blockquote>
                                                ),
                                            }}
                                        >
                                            {message.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4">
                                        <div className="flex space-x-2">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="flex space-x-4">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Nhập tin nhắn của bạn..."
                            className="flex-1 px-4 py-3 
                            bg-gray-50 dark:bg-gray-700 
                            border border-gray-200 dark:border-gray-700
                            rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500
                            text-gray-900 dark:text-white
                            placeholder-gray-400 dark:placeholder-gray-500"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="px-6 py-3 
                            bg-gradient-to-r from-blue-500 to-indigo-500 
                            text-white font-medium rounded-xl
                            hover:from-blue-600 hover:to-indigo-600 
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transform active:scale-[0.98] transition-all duration-200"
                        >
                            Gửi
                        </button>
                    </form>
                </div>
            </div>
            <Toaster />
        </div>
    );
}