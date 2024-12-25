'use client'
import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCopy, faImage, faFileUpload } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import TextareaAutosize from 'react-textarea-autosize';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    imageUrls?: string[];
    files?: { name: string, type: string }[];
}

interface ChatHistory {
    role: 'user' | 'model';
    parts: { text: string }[];
}

interface ImagePart {
    inlineData: {
        data: string;
        mimeType: string;
    };
}

// Thêm constant cho các định dạng file được hỗ trợ
const SUPPORTED_FILE_TYPES = [
    'application/pdf',
    'application/x-javascript',
    'text/javascript',
    'application/x-python',
    'text/x-python',
    'text/plain',
    'text/html',
    'text/css',
    'text/md',
    'text/csv',
    'text/xml',
    'text/rtf'
];

export default function ChatPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [model, setModel] = useState<any>(null);
    const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
    const [streamingText, setStreamingText] = useState('');
    const streamEndRef = useRef<HTMLDivElement>(null);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [filePreviews, setFilePreviews] = useState<{ name: string, type: string }[]>([]);
    const documentInputRef = useRef<HTMLInputElement>(null);

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
        if (streamingText) {
            streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, streamingText]);

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const validFiles = files.filter(file => file.size <= 5 * 1024 * 1024);

        if (validFiles.length < files.length) {
            toast.error('Một số ảnh vượt quá giới hạn 5MB');
        }

        setSelectedImages(prev => [...prev, ...validFiles]);

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !selectedImages.length && !selectedFiles.length) || !model || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setIsLoading(true);
        setStreamingText('');

        try {
            let parts = [];
            let imageUrls: string[] = [];
            let files = [...filePreviews];

            if (selectedImages.length > 0 && imagePreviews.length > 0) {
                imageUrls = [...imagePreviews];
                for (const preview of imagePreviews) {
                    const imageData = preview.split(',')[1] || '';
                    const imagePart: ImagePart = {
                        inlineData: {
                            data: imageData,
                            mimeType: selectedImages[0].type,
                        }
                    };
                    parts.push(imagePart);
                }
            }

            if (userMessage) {
                parts.push(userMessage);
            }

            if (selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    const reader = new FileReader();
                    const fileData = await new Promise<string>((resolve) => {
                        reader.onloadend = () => {
                            const base64Data = reader.result as string;
                            resolve(base64Data.split(',')[1] || '');
                        };
                        reader.readAsDataURL(file);
                    });

                    parts.push({
                        inlineData: {
                            data: fileData,
                            mimeType: file.type
                        }
                    });
                }
            }

            setChatHistory(prev => [...prev, {
                role: 'user',
                parts: [{ text: userMessage }]
            }]);

            setMessages(prev => [...prev, {
                role: 'user',
                content: userMessage,
                imageUrls: imageUrls,
                files: files
            }]);

            handleRemoveImage();
            setSelectedFiles([]);
            setFilePreviews([]);
            if (documentInputRef.current) {
                documentInputRef.current.value = '';
            }

            const result = await model.sendMessageStream(parts);
            let fullResponse = '';

            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullResponse += chunkText;
                setStreamingText(fullResponse);
            }

            setChatHistory(prev => [...prev, {
                role: 'model',
                parts: [{ text: fullResponse }]
            }]);

            setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }]);
            setStreamingText('');

        } catch (error) {
            console.error('Lỗi khi gửi tin nhắn:', error);
            toast.error('Lỗi khi gửi tin nhắn');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoBack = () => {
        router.push('/');
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Đã sao chép vào clipboard');
        } catch (err) {
            toast.error('Không thể sao chép');
        }
    };

    const handleRemoveImage = (index?: number) => {
        if (typeof index === 'number') {
            setSelectedImages(prev => prev.filter((_, i) => i !== index));
            setImagePreviews(prev => prev.filter((_, i) => i !== index));
        } else {
            setSelectedImages([]);
            setImagePreviews([]);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        // Kiểm tra định dạng file
        const invalidFiles = files.filter(file => !SUPPORTED_FILE_TYPES.includes(file.type));
        if (invalidFiles.length > 0) {
            toast.error('Định dạng file không được hỗ trợ. Chỉ hỗ trợ PDF, TXT, DOC, DOCX, CSV, MD, HTML, CSS, JS, PY, XML, RTF');
            if (documentInputRef.current) {
                documentInputRef.current.value = '';
            }
            return;
        }

        const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024);

        if (validFiles.length < files.length) {
            toast.error('Một số tệp vượt quá giới hạn 10MB');
        }

        setSelectedFiles(prev => [...prev, ...validFiles]);

        const newFilePreviews = validFiles.map(file => ({
            name: file.name,
            type: file.type
        }));

        setFilePreviews(prev => [...prev, ...newFilePreviews]);
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setFilePreviews(prev => prev.filter((_, i) => i !== index));
        if (documentInputRef.current) {
            documentInputRef.current.value = '';
        }
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

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-2 sm:p-4">
                    <div className="flex-1 overflow-y-auto mb-2 sm:mb-4 h-[calc(100vh-210px)]">
                        <div className="space-y-2 sm:space-y-4">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
                                >
                                    <div className={`${message.role === 'user' ? 'ml-auto' : 'mr-auto'} max-w-[85%]`}>
                                        <div className={`rounded-xl p-2.5 sm:p-4 ${message.role === 'user'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                            }`}>
                                            {message.files && message.files.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {message.files.map((file, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center gap-2 px-3 py-2 
                                                                bg-gray-50/10 dark:bg-gray-600/30
                                                                border border-gray-200/20 dark:border-gray-600/30
                                                                rounded-lg"
                                                        >
                                                            <svg
                                                                className="w-5 h-5 text-current opacity-70"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                                />
                                                            </svg>
                                                            <span className="text-sm opacity-90 truncate max-w-[150px]">
                                                                {file.name}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {message.imageUrls && message.imageUrls.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {message.imageUrls.map((url, idx) => (
                                                        <div key={idx} className="w-40 h-40 sm:w-48 sm:h-48 overflow-hidden rounded-lg">
                                                            <img
                                                                src={url}
                                                                alt={`Uploaded ${idx + 1}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {message.content && (
                                                <ReactMarkdown
                                                    className="prose dark:prose-invert max-w-none text-sm sm:text-base break-words"
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        code({ inline, className, children, ...props }: {
                                                            inline?: boolean;
                                                            className?: string;
                                                            children?: React.ReactNode;
                                                        }) {
                                                            const match = /language-(\w+)/.exec(className || '');
                                                            return !inline && match ? (
                                                                <div className="relative">
                                                                    <button
                                                                        onClick={() => copyToClipboard(String(children))}
                                                                        className="absolute -top-2 -right-2 p-2 bg-gray-700 rounded-lg 
                                                                        hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm z-10"
                                                                    >
                                                                        <FontAwesomeIcon icon={faCopy} className="text-gray-300 w-4 h-4" />
                                                                    </button>
                                                                    <SyntaxHighlighter
                                                                        {...props}
                                                                        style={atomDark}
                                                                        language={match[1]}
                                                                        PreTag="div"
                                                                        className="rounded-lg"
                                                                    >
                                                                        {String(children).replace(/\n$/, '')}
                                                                    </SyntaxHighlighter>
                                                                </div>
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
                                            )}
                                        </div>
                                        <div className={`flex mt-1 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <button
                                                onClick={() => copyToClipboard(message.content)}
                                                className="opacity-0 group-hover:opacity-100 p-2 bg-gray-700 rounded-lg 
                                                    hover:bg-gray-600 transition-all duration-200 flex items-center gap-2 text-sm"
                                            >
                                                <FontAwesomeIcon icon={faCopy} className="text-gray-300 w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && !streamingText && (
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
                            {streamingText && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 max-w-[85%]">
                                        <ReactMarkdown
                                            className="prose dark:prose-invert max-w-none text-sm sm:text-base break-words"
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                code({ inline, className, children, ...props }: {
                                                    inline?: boolean;
                                                    className?: string;
                                                    children?: React.ReactNode;
                                                }) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return !inline && match ? (
                                                        <div className="relative">
                                                            <button
                                                                onClick={() => copyToClipboard(String(children))}
                                                                className="absolute -top-2 -right-2 p-2 bg-gray-700 rounded-lg 
                                                                hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm z-10"
                                                            >
                                                                <FontAwesomeIcon icon={faCopy} className="text-gray-300 w-4 h-4" />
                                                            </button>
                                                            <SyntaxHighlighter
                                                                {...props}
                                                                style={atomDark}
                                                                language={match[1]}
                                                                PreTag="div"
                                                                className="rounded-lg"
                                                            >
                                                                {String(children).replace(/\n$/, '')}
                                                            </SyntaxHighlighter>
                                                        </div>
                                                    ) : (
                                                        <code {...props} className={className}>
                                                            {children}
                                                        </code>
                                                    );
                                                },
                                                // Tùy chỉnh các thẻ markdown khác
                                                p: ({ children }) => (
                                                    <p className="mb-4 last:mb-0">
                                                        {String(children).replace(/\.\.\.$/, '')}
                                                    </p>
                                                ),
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
                                            {streamingText.replace(/\.\.\.$/, '')}
                                        </ReactMarkdown>
                                        <div ref={streamEndRef} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {imagePreviews.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {imagePreviews.map((preview, index) => (
                                    <div key={index} className="relative inline-block">
                                        <div className="relative w-40 h-40 sm:w-48 sm:h-48 overflow-hidden rounded-2xl
                                            border-2 border-gray-200 dark:border-gray-700
                                            bg-gray-50 dark:bg-gray-800
                                            shadow-sm hover:shadow-md transition-all duration-200"
                                        >
                                            <img
                                                src={preview}
                                                alt={`Preview ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveImage(index)}
                                                className="absolute top-2 right-2 
                                                    p-1.5 rounded-full
                                                    bg-red-500 hover:bg-red-600 
                                                    text-white shadow-lg
                                                    transform hover:scale-105 
                                                    transition-all duration-200"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {filePreviews.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {filePreviews.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 px-3 py-2 
                                            bg-gray-50 dark:bg-gray-700 
                                            border border-gray-200 dark:border-gray-600 
                                            rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-600
                                            transition-all duration-200
                                            max-w-[200px]"
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <svg
                                                className="w-5 h-5 flex-shrink-0 text-gray-500 dark:text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                />
                                            </svg>
                                            <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                                {file.name}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFile(index)}
                                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-500 
                                                rounded-full transition-colors duration-200
                                                flex-shrink-0"
                                        >
                                            <svg
                                                className="w-4 h-4 text-gray-500 dark:text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M6 18L18 6M6 6l12 12"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-col space-y-2">
                            <div className="flex gap-2 sm:hidden">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageSelect}
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2.5 
                                        flex-1
                                        flex items-center justify-center gap-2
                                        bg-gray-100 hover:bg-gray-200 
                                        dark:bg-gray-700 dark:hover:bg-gray-600 
                                        text-gray-600 dark:text-gray-300
                                        rounded-xl border border-gray-200 dark:border-gray-600
                                        transition-all duration-200"
                                >
                                    <FontAwesomeIcon icon={faImage} className="w-5 h-5" />
                                    <span className="text-sm font-medium">Thêm ảnh</span>
                                </button>

                                <input
                                    type="file"
                                    ref={documentInputRef}
                                    onChange={handleFileSelect}
                                    accept=".pdf,.txt,.js,.py,.html,.css,.md,.csv,.xml,.rtf"
                                    multiple
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => documentInputRef.current?.click()}
                                    className="p-2.5 
                                        flex-1
                                        flex items-center justify-center gap-2
                                        bg-gray-100 hover:bg-gray-200 
                                        dark:bg-gray-700 dark:hover:bg-gray-600 
                                        text-gray-600 dark:text-gray-300
                                        rounded-xl border border-gray-200 dark:border-gray-600
                                        transition-all duration-200"
                                >
                                    <FontAwesomeIcon icon={faFileUpload} className="w-5 h-5" />
                                    <span className="text-sm font-medium">Thêm tệp</span>
                                </button>
                            </div>

                            <div className="flex items-end space-x-2">
                                <div className="hidden sm:flex space-x-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageSelect}
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2.5 
                                            min-h-[42px] min-w-[42px]
                                            flex items-center justify-center
                                            bg-gray-100 hover:bg-gray-200 
                                            dark:bg-gray-700 dark:hover:bg-gray-600 
                                            text-gray-600 dark:text-gray-300
                                            rounded-xl border border-gray-200 dark:border-gray-600
                                            transition-all duration-200
                                            group relative"
                                        title="Tải ảnh lên"
                                    >
                                        <FontAwesomeIcon
                                            icon={faImage}
                                            className="w-5 h-5 transform group-hover:scale-110 transition-transform"
                                        />
                                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 
                                            px-2 py-1 rounded-lg text-xs font-medium
                                            bg-gray-800 dark:bg-gray-700 text-white
                                            opacity-0 group-hover:opacity-100
                                            transition-opacity duration-200
                                            whitespace-nowrap
                                            z-10"
                                        >
                                            Tải ảnh lên
                                        </span>
                                    </button>

                                    <input
                                        type="file"
                                        ref={documentInputRef}
                                        onChange={handleFileSelect}
                                        accept=".pdf,.txt,.js,.py,.html,.css,.md,.csv,.xml,.rtf"
                                        multiple
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => documentInputRef.current?.click()}
                                        className="p-2.5 
                                            min-h-[42px] min-w-[42px]
                                            flex items-center justify-center
                                            bg-gray-100 hover:bg-gray-200 
                                            dark:bg-gray-700 dark:hover:bg-gray-600 
                                            text-gray-600 dark:text-gray-300
                                            rounded-xl border border-gray-200 dark:border-gray-600
                                            transition-all duration-200
                                            group relative"
                                        title="Tải tài liệu"
                                    >
                                        <FontAwesomeIcon
                                            icon={faFileUpload}
                                            className="w-5 h-5 transform group-hover:scale-110 transition-transform"
                                        />
                                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 
                                            px-2 py-1 rounded-lg text-xs font-medium
                                            bg-gray-800 dark:bg-gray-700 text-white
                                            opacity-0 group-hover:opacity-100
                                            transition-opacity duration-200
                                            whitespace-nowrap
                                            z-10"
                                        >
                                            Tải tài liệu
                                        </span>
                                    </button>
                                </div>

                                <TextareaAutosize
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit(e);
                                        }
                                    }}
                                    placeholder="Nhập tin nhắn..."
                                    className="flex-1 px-3 py-2.5 
                                        text-sm sm:text-base 
                                        bg-gray-50 dark:bg-gray-700 
                                        border border-gray-200 dark:border-gray-600
                                        rounded-xl 
                                        focus:outline-none focus:ring-2 focus:ring-blue-500
                                        text-gray-900 dark:text-white
                                        placeholder-gray-400 dark:placeholder-gray-500
                                        resize-none min-h-[42px]
                                        transition-all duration-200"
                                    disabled={isLoading}
                                    minRows={1}
                                    maxRows={5}
                                />

                                <button
                                    type="submit"
                                    disabled={isLoading || (!input.trim() && !selectedImages.length && !selectedFiles.length)}
                                    className="px-4 py-2.5 
                                        min-h-[42px]
                                        text-sm sm:text-base 
                                        bg-gradient-to-r from-blue-500 to-indigo-500 
                                        text-white font-medium rounded-xl
                                        hover:from-blue-600 hover:to-indigo-600 
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                        transform active:scale-[0.98] 
                                        transition-all duration-200"
                                >
                                    Gửi
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            <Toaster />
        </div>
    );
}