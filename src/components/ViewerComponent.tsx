'use client'
import { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { toast } from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots, faExpand, faCompress, faCopy, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import TextareaAutosize from 'react-textarea-autosize';
import { useRouter } from 'next/navigation';

interface Message {
    id: string;
    content: string;
    timestamp: Date;
}

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

export default function ViewerComponent({ streamId }: { streamId: string }) {
    const router = useRouter();
    const videoRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Cuộn xuống cuối khi có tin nhắn mới
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const setupViewer = async () => {
            try {
                const response = await fetch('/api/agora/get-credentials');
                const { appId } = await response.json();

                if (!appId) {
                    throw new Error('Không thể lấy thông tin kết nối');
                }

                await client.join(appId, streamId, null);
                setIsConnected(true);

                client.on('user-published', async (user, mediaType) => {
                    await client.subscribe(user, mediaType);
                    if (mediaType === 'video' && videoRef.current) {
                        user.videoTrack?.play(videoRef.current);
                    }
                });

                client.on('user-unpublished', async (user) => {
                    await client.unsubscribe(user);
                });

            } catch (error) {
                console.error('Lỗi khi xem màn hình:', error);
                toast.error('Không thể kết nối tới luồng phát!');
            }
        };

        setupViewer();
        return () => {
            client.leave();
        };
    }, [streamId]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newMessage]);
        setInput('');
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleGoBack = () => {
        // Đóng tab hiện tại và quay lại tab trước đó
        window.close();
        // Fallback nếu window.close() không hoạt động
        if (!window.closed) {
            window.history.back();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <div className="flex h-screen relative">
                {/* Main Content */}
                <div className={`flex-1 flex flex-col ${isChatOpen ? 'md:mr-[320px]' : ''}`}>
                    {/* Header */}
                    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                        <div className="max-w-6xl mx-auto flex items-center justify-between">
                            <div className="flex items-center gap-2 md:gap-4">
                                <button
                                    onClick={handleGoBack}
                                    className="group flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 
                                    text-sm md:text-base text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white
                                    bg-gray-100 dark:bg-gray-700 rounded-lg 
                                    transition-all duration-200"
                                >
                                    <FontAwesomeIcon
                                        icon={faArrowLeft}
                                        className="w-3 h-3 md:w-4 md:h-4 group-hover:-translate-x-1 transition-transform"
                                    />
                                    <span className="font-medium">Quay lại</span>
                                </button>
                                <h1 className="text-base md:text-xl font-bold text-gray-900 dark:text-white">
                                    Xem Màn Hình
                                </h1>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsChatOpen(!isChatOpen)}
                                    className="p-2 text-gray-600 dark:text-gray-300 
                                    hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg
                                    transition-colors"
                                    title="Mở/đóng chat"
                                >
                                    <FontAwesomeIcon icon={faCommentDots} className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={toggleFullscreen}
                                    className="p-2 text-gray-600 dark:text-gray-300 
                                    hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg
                                    transition-colors"
                                    title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                                >
                                    <FontAwesomeIcon
                                        icon={isFullscreen ? faCompress : faExpand}
                                        className="w-5 h-5"
                                    />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Video Container */}
                    <div className="flex-1 p-4 overflow-hidden">
                        <div className="max-w-6xl mx-auto h-full">
                            {!isConnected ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="text-center space-y-4">
                                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto" />
                                        <p className="text-gray-600 dark:text-gray-400">
                                            Đang kết nối...
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    ref={videoRef}
                                    className="w-full h-full bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden"
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Chat Sidebar - Modified for mobile */}
                {isChatOpen && (
                    <div className="fixed inset-0 z-50 md:relative md:inset-auto 
                        w-full md:w-[320px] bg-white dark:bg-gray-800 
                        border-l border-gray-200 dark:border-gray-700
                        flex flex-col"
                    >
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Chat
                            </h2>
                            {/* Add close button for mobile */}
                            <button
                                onClick={() => setIsChatOpen(false)}
                                className="md:hidden p-2 text-gray-600 dark:text-gray-300 
                                hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map(message => (
                                <div key={message.id} className="space-y-1">
                                    <div className="bg-blue-500 text-white p-3 rounded-lg inline-block">
                                        {message.content}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(message.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex gap-2">
                                <TextareaAutosize
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e);
                                        }
                                    }}
                                    placeholder="Nhập tin nhắn..."
                                    className="flex-1 px-3 py-2 
                                        text-sm bg-gray-50 dark:bg-gray-700 
                                        border border-gray-200 dark:border-gray-600
                                        rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
                                        text-gray-900 dark:text-white
                                        placeholder-gray-400 dark:placeholder-gray-500
                                        resize-none"
                                    minRows={1}
                                    maxRows={4}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim()}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg
                                        hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                                        transition-colors"
                                >
                                    Gửi
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
} 