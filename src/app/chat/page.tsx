'use client'
import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCopy, faImage, faFileUpload, faCompress, faExpand, faTimes, faCode, faSpinner, faPlay } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import TextareaAutosize from 'react-textarea-autosize';
import dynamic from 'next/dynamic';
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

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

// Thêm interface cho modal
interface CodePreviewModal {
    isOpen: boolean;
    content: string;
    originalCode: string;
    isFullscreen: boolean;
    mode?: 'preview' | 'run' | 'result' | 'edit';
    language?: string;
}

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
    const [codePreview, setCodePreview] = useState<CodePreviewModal>({
        isOpen: false,
        content: '',
        originalCode: '',
        isFullscreen: false,
        mode: 'preview',
        language: ''
    });
    const [isExecuting, setIsExecuting] = useState(false);

    const suggestionMessages = [
        "Hướng dẫn cách viết một REST API đơn giản với Node.js",
        "Đề xuất ý tưởng thiết kế giao diện cho ứng dụng học trực tuyến",
        "Tóm tắt nội dung chính của một bài báo khoa học",
        "Phân tích ưu nhược điểm của các framework JavaScript phổ biến"
    ];

    const handleSuggestionClick = (message: string) => {
        setInput(message);
    };

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

    const handlePaste = (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file && file.size <= 5 * 1024 * 1024) {
                    setSelectedImages(prev => [...prev, file]);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setImagePreviews(prev => [...prev, reader.result as string]);
                    };
                    reader.readAsDataURL(file);
                } else if (file) {
                    toast.error('Ảnh vượt quá giới hạn 5MB');
                }
            }
        }
    };

    useEffect(() => {
        document.addEventListener('paste', handlePaste);
        return () => {
            document.removeEventListener('paste', handlePaste);
        };
    }, []);

    // Thêm hàm để mở/đóng modal
    const handleCodePreview = (code: string, language?: string) => {
        const cleanCode = code.replace(/^```(\w+)?\n/, '').replace(/```$/, '');

        setCodePreview({
            isOpen: true,
            content: cleanCode,
            originalCode: cleanCode,
            isFullscreen: false,
            mode: language === 'javascript' || language === 'python' ? 'run' : 'preview',
            language: language || detectLanguage(cleanCode)
        });
    };

    // Thêm hàm phát hiện ngôn ngữ lập trình
    const detectLanguage = (code: string): string => {
        // Kiểm tra các từ khóa đặc trưng của từng ngôn ngữ
        if (code.includes('def ') || code.includes('import ') || code.includes('print(')) {
            return 'python';
        }
        if (code.includes('function') || code.includes('const ') || code.includes('let ')) {
            return 'javascript';
        }
        if (code.includes('<html') || code.includes('<!DOCTYPE')) {
            return 'html';
        }
        if (code.includes('class') && code.includes('{')) {
            return 'java';
        }
        // Mặc định là javascript
        return 'javascript';
    };

    const closeCodePreview = () => {
        setCodePreview({
            isOpen: false,
            content: '',
            originalCode: '',
            isFullscreen: false,
            mode: 'preview',
            language: ''
        });
    };

    const toggleFullscreen = () => {
        setCodePreview(prev => ({
            ...prev,
            isFullscreen: !prev.isFullscreen
        }));
    };

    const handleRunCode = async (code: string, language: string) => {
        try {
            setIsExecuting(true);
            setCodePreview(prev => ({
                ...prev,
                mode: 'result',
                content: '',
            }));

            const response = await fetch('/api/e2b/run', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code,
                    language
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Lỗi khi chạy code');
            }

            setCodePreview(prev => ({
                ...prev,
                content: data.output,
                mode: 'result'
            }));

        } catch (error) {
            console.error('Lỗi khi chạy code:', error);
            toast.error('Có lỗi xảy ra khi chạy code');
        } finally {
            setIsExecuting(false);
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
                        {messages.length === 0 ? (
                            <div className="h-full flex items-center justify-center p-4">
                                <div className="text-center space-y-4 sm:space-y-6 w-full max-w-2xl mx-auto">
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-200">
                                        Bắt đầu cuộc trò chuyện với AI
                                    </h2>
                                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                                        Chọn một câu hỏi mẫu hoặc nhập câu hỏi của bạn
                                    </p>
                                    <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
                                        {suggestionMessages.map((message, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleSuggestionClick(message)}
                                                className="p-3 sm:p-4 text-left
                                                    bg-gray-50 dark:bg-gray-700
                                                    hover:bg-gray-100 dark:hover:bg-gray-600
                                                    border border-gray-200 dark:border-gray-600
                                                    rounded-xl
                                                    transition-all duration-200
                                                    group"
                                            >
                                                <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-300
                                                    group-hover:text-gray-900 dark:group-hover:text-white
                                                    line-clamp-2 sm:line-clamp-none">
                                                    {message}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
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
                                                                        <div className="absolute -top-2 right-0 flex gap-2 z-10">
                                                                            {(match[1] === 'javascript' || match[1] === 'js' || match[1] === 'python' || match[1] === 'py' || match[1] === 'html') && (
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const code = String(children).replace(/\n$/, '');
                                                                                        setCodePreview({
                                                                                            isOpen: true,
                                                                                            content: code,
                                                                                            originalCode: code,
                                                                                            isFullscreen: false,
                                                                                            mode: 'edit',
                                                                                            language: match[1]
                                                                                        });
                                                                                    }}
                                                                                    className="p-2 bg-gray-700 rounded-lg 
                                                                                    hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm"
                                                                                >
                                                                                    <FontAwesomeIcon icon={match[1] === 'html' ? faCode : faPlay} className="w-4 h-4" />
                                                                                    <span>{match[1] === 'html' ? 'Xem' : 'Chạy'}</span>
                                                                                </button>
                                                                            )}

                                                                            <button
                                                                                onClick={() => copyToClipboard(String(children))}
                                                                                className="p-2 bg-gray-700 rounded-lg 
                                                                                hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm"
                                                                            >
                                                                                <FontAwesomeIcon icon={faCopy} className="text-gray-300 w-4 h-4" />
                                                                            </button>
                                                                        </div>
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
                        )}
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

            {/* Code Preview Modal */}
            {codePreview.isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
                        </div>

                        <div className={`inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all 
                            ${codePreview.isFullscreen ? 'fixed inset-0 w-full h-full rounded-none' : 'sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full'}`}>
                            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                    Chạy code
                                </h3>
                                <div className="flex items-center gap-2">
                                    {codePreview.mode === 'run' && (
                                        <button
                                            onClick={() => handleRunCode(codePreview.content, codePreview.language || '')}
                                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                        >
                                            Chạy
                                        </button>
                                    )}
                                    <button
                                        onClick={toggleFullscreen}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        title={codePreview.isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
                                    >
                                        <FontAwesomeIcon
                                            icon={codePreview.isFullscreen ? faCompress : faExpand}
                                            className="w-4 h-4 text-gray-500 dark:text-gray-400"
                                        />
                                    </button>
                                    <button
                                        onClick={closeCodePreview}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        title="Đóng"
                                    >
                                        <FontAwesomeIcon
                                            icon={faTimes}
                                            className="w-4 h-4 text-gray-500 dark:text-gray-400"
                                        />
                                    </button>
                                </div>
                            </div>
                            <div className={`${codePreview.isFullscreen ? 'h-[calc(100vh-56px)]' : 'h-[80vh]'} overflow-auto`}>
                                {codePreview.mode === 'preview' ? (
                                    <iframe
                                        srcDoc={codePreview.content}
                                        className="w-full h-full"
                                        title="HTML Preview"
                                        sandbox="allow-scripts"
                                    />
                                ) : codePreview.mode === 'result' ? (
                                    <div className="p-4 h-full">
                                        {codePreview.language === 'html' ? (
                                            <>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                                        Kết quả HTML:
                                                    </h3>
                                                    <button
                                                        onClick={() => setCodePreview(prev => ({
                                                            ...prev,
                                                            mode: 'edit',
                                                            content: prev.originalCode
                                                        }))}
                                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 
                                                            text-white rounded-lg transition-colors text-sm
                                                            flex items-center gap-2"
                                                    >
                                                        <FontAwesomeIcon icon={faCode} className="w-4 h-4" />
                                                        <span>Chỉnh sửa HTML</span>
                                                    </button>
                                                </div>
                                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg h-[calc(100%-3rem)] overflow-auto">
                                                    <iframe
                                                        srcDoc={codePreview.originalCode}
                                                        className="w-full h-full"
                                                        title="HTML Preview"
                                                        sandbox="allow-scripts"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {isExecuting ? (
                                                    <div className="flex flex-col items-center justify-center space-y-4 text-gray-400">
                                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400"></div>
                                                        <p>Đang thực thi lệnh...</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                                                Kết quả thực thi:
                                                            </h3>
                                                            <button
                                                                onClick={() => setCodePreview(prev => ({
                                                                    ...prev,
                                                                    mode: 'edit',
                                                                    content: prev.originalCode
                                                                }))}
                                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 
                                                                    text-white rounded-lg transition-colors text-sm
                                                                    flex items-center gap-2"
                                                            >
                                                                <FontAwesomeIcon icon={faCode} className="w-4 h-4" />
                                                                <span>Chỉnh sửa code</span>
                                                            </button>
                                                        </div>
                                                        <pre className="whitespace-pre-wrap bg-gray-900 p-4 rounded-lg text-green-400 overflow-auto max-h-[calc(100vh-200px)]">
                                                            {codePreview.content}
                                                        </pre>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ) : codePreview.mode === 'edit' ? (
                                    <div className="h-full relative">
                                        <MonacoEditor
                                            height="100%"
                                            defaultLanguage={codePreview.language || 'javascript'}
                                            defaultValue={codePreview.content}
                                            theme="vs-dark"
                                            onChange={(value) => {
                                                if (value) setCodePreview(prev => ({
                                                    ...prev,
                                                    content: value,
                                                    originalCode: value
                                                }));
                                            }}
                                            options={{
                                                minimap: { enabled: false },
                                                fontSize: 14,
                                                lineNumbers: 'on',
                                                roundedSelection: false,
                                                scrollBeyondLastLine: false,
                                                automaticLayout: true
                                            }}
                                        />
                                        <div className="absolute bottom-4 right-4">
                                            <button
                                                onClick={() => {
                                                    if (codePreview.language === 'html') {
                                                        setCodePreview(prev => ({
                                                            ...prev,
                                                            mode: 'result',
                                                            content: prev.content
                                                        }));
                                                    } else {
                                                        handleRunCode(codePreview.content, codePreview.language || '');
                                                    }
                                                }}
                                                className="px-4 py-2 bg-green-600 hover:bg-green-700 
                                                    text-white rounded-lg transition-colors text-sm
                                                    flex items-center gap-2"
                                                disabled={isExecuting}
                                            >
                                                {isExecuting ? (
                                                    <>
                                                        <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
                                                        <span>Đang chạy...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FontAwesomeIcon icon={codePreview.language === 'html' ? faCode : faPlay} className="w-4 h-4" />
                                                        <span>{codePreview.language === 'html' ? 'Xem kết quả' : 'Chạy code'}</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4">
                                        <pre className="whitespace-pre-wrap">{codePreview.content}</pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Toaster />
        </div>
    );
}