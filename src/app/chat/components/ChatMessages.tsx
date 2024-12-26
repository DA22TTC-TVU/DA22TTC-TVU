// ChatMessages.tsx
'use client'
import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faPlay, faCode, faArrowUp, faRotate, faTrash } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-hot-toast';
import { Message, CodePreviewModalType } from '../types/chat';

interface ChatMessagesProps {
    messages: Message[];
    isLoading: boolean;
    streamingText: string;
    setCodePreview: React.Dispatch<React.SetStateAction<CodePreviewModalType>>;
    isMobile: boolean;
    setInput: any;
    regenerateMessage: (index: number) => void;
    deleteMessage: (index: number) => void;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({
    messages,
    isLoading,
    streamingText,
    setCodePreview,
    isMobile,
    setInput,
    regenerateMessage,
    deleteMessage
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const streamEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (streamingText) {
            streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } else {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, streamingText]);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Đã sao chép vào clipboard');
        } catch (err) {
            toast.error('Không thể sao chép');
        }
    };

    const suggestionMessages = [
        "Hướng dẫn cách viết một REST API đơn giản với Node.js",
        "Đề xuất ý tưởng thiết kế giao diện cho ứng dụng học trực tuyến",
        "Tóm tắt nội dung chính của một bài báo khoa học",
        "Phân tích ưu nhược điểm của các framework JavaScript phổ biến"
    ];

    const handleSuggestionClick = (message: string) => {
        setInput(message);
    };

    return (
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
                            id={`message-${index}`}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
                        >
                            <div className={`${message.role === 'user' ? 'mx-2' : 'w-full'} `}>
                                <div className={`p-2.5 sm:p-4 ${message.role === 'user'
                                    ? 'bg-blue-500 text-white rounded-xl'
                                    : 'text-gray-900 dark:text-white'
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
                                                                                isFullscreen: isMobile,
                                                                                mode: 'edit',
                                                                                language: match[1]
                                                                            });
                                                                        }}
                                                                        className="p-2 bg-gray-700 hover:bg-gray-600 
                                                                            text-gray-100 dark:text-gray-200
                                                                            rounded-lg transition-colors 
                                                                            flex items-center gap-2 text-sm"
                                                                    >
                                                                        <FontAwesomeIcon
                                                                            icon={match[1] === 'html' ? faCode : faPlay}
                                                                            className="w-4 h-4"
                                                                        />
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
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                const messageElement = document.getElementById(`message-${index}`);
                                                messageElement?.scrollIntoView({ behavior: 'smooth' });
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-2 bg-gray-700 rounded-lg 
                                                    hover:bg-gray-600 transition-all duration-200 flex items-center gap-2 text-sm"
                                        >
                                            <FontAwesomeIcon icon={faArrowUp} className="text-gray-300 w-3 h-3" />
                                        </button>
                                        {message.role === 'assistant' && (
                                            <button
                                                onClick={() => regenerateMessage(index)}
                                                className="opacity-0 group-hover:opacity-100 p-2 bg-gray-700 rounded-lg 
                                                        hover:bg-gray-600 transition-all duration-200 flex items-center gap-2 text-sm"
                                            >
                                                <FontAwesomeIcon icon={faRotate} className="text-gray-300 w-3 h-3" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => copyToClipboard(message.content)}
                                            className="opacity-0 group-hover:opacity-100 p-2 bg-gray-700 rounded-lg 
                                                    hover:bg-gray-600 transition-all duration-200 flex items-center gap-2 text-sm"
                                        >
                                            <FontAwesomeIcon icon={faCopy} className="text-gray-300 w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => deleteMessage(index)}
                                            className="opacity-0 group-hover:opacity-100 p-2 bg-gray-700 rounded-lg 
                                                    hover:bg-red-600 transition-all duration-200 flex items-center gap-2 text-sm"
                                        >
                                            <FontAwesomeIcon icon={faTrash} className="text-gray-300 w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && !streamingText && (
                        <div className="flex justify-start w-full">
                            <div className="rounded-xl p-4 w-full">
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
                        <div className="flex justify-start w-full">
                            <div className="p-4 w-full">
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
                                                {Array.isArray(children)
                                                    ? children.map((child, i) =>
                                                        typeof child === 'object' ? '' : child
                                                    ).join('')
                                                    : children
                                                }
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
                                    {streamingText}
                                </ReactMarkdown>
                                <div ref={streamEndRef} />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChatMessages;