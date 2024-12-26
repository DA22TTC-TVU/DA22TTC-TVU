'use client'
import React from 'react';
import { DriveInfo } from '../types';
import { getDatabaseInstance } from '../lib/firebaseConfig';
import { ref, onValue, push, set, get, remove } from 'firebase/database';
import dynamic from 'next/dynamic';

const Broadcast = dynamic(() => import('./Broadcast'), {
    ssr: false // Tắt Server Side Rendering cho component này
});

declare module 'react' {
    interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
        webkitdirectory?: string;
        directory?: string;
    }
}

interface SidebarProps {
    driveInfo: DriveInfo | null;
    onCreateFolder: () => void;
    onUploadFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onUploadFolder: (e: React.ChangeEvent<HTMLInputElement>) => void;
    formatBytes: (bytes: number) => string;
    isOpen: boolean;
    onClose: () => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    isLoading?: boolean;
}

export default function Sidebar({ driveInfo, onCreateFolder, onUploadFile, onUploadFolder, formatBytes, isOpen, onClose, fileInputRef, isLoading = false }: SidebarProps) {
    const folderInputRef = React.useRef<HTMLInputElement>(null);
    const [isChatOpen, setIsChatOpen] = React.useState(false);
    const [messages, setMessages] = React.useState<{ id: string, text: string, timestamp: number }[]>([]);
    const [newMessage, setNewMessage] = React.useState('');
    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [lastSeenTimestamp, setLastSeenTimestamp] = React.useState(Date.now());
    const [streamCount, setStreamCount] = React.useState(0);
    const [isModalOpen, setIsModalOpen] = React.useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    React.useEffect(() => {
        scrollToBottom();
    }, [messages]);

    React.useEffect(() => {
        let isMounted = true;

        // Reset unreadCount về 0 khi thay đổi trạng thái modal
        setUnreadCount(0);

        if (isChatOpen) {
            const setupChat = async () => {
                try {
                    const database = await getDatabaseInstance();
                    const messagesRef = ref(database, 'messages');

                    const unsubscribe = onValue(messagesRef, (snapshot) => {
                        if (!isMounted) return;

                        const data = snapshot.val();
                        if (data) {
                            const messageList = Object.entries(data).map(([id, msg]: [string, any]) => ({
                                id,
                                text: msg.text,
                                timestamp: msg.timestamp
                            }));

                            // Sắp xếp trước khi set state
                            const sortedMessages = [...messageList].sort((a, b) => b.timestamp - a.timestamp);

                            // Kiểm tra nếu có sự thay đổi thực sự
                            if (JSON.stringify(sortedMessages) !== JSON.stringify(messages)) {
                                setMessages(sortedMessages);
                            }
                        } else {
                            // Chỉ set empty array nếu hiện tại có messages
                            if (messages.length > 0) {
                                setMessages([]);
                            }
                        }
                    });

                    if (isMounted) {
                        setLastSeenTimestamp(Date.now());
                    }

                    return () => {
                        unsubscribe();
                    };
                } catch (error) {
                    console.error("Error setting up chat:", error);
                }
            };

            setupChat();
        } else {
            const countUnreadMessages = async () => {
                try {
                    const database = await getDatabaseInstance();
                    const messagesRef = ref(database, 'messages');

                    const unsubscribe = onValue(messagesRef, (snapshot) => {
                        if (!isMounted) return;

                        const data = snapshot.val();
                        if (data) {
                            const messageList = Object.entries(data).map(([id, msg]: [string, any]) => ({
                                timestamp: msg.timestamp
                            }));
                            const unread = messageList.filter(msg => msg.timestamp > lastSeenTimestamp).length;

                            // Chỉ cập nhật nếu có sự thay đổi
                            if (unread !== unreadCount) {
                                setUnreadCount(unread);
                            }
                        }
                    });

                    return () => unsubscribe();
                } catch (error) {
                    console.error("Error counting unread messages:", error);
                }
            };

            countUnreadMessages();
        }

        return () => {
            isMounted = false;
        };
    }, [isChatOpen, lastSeenTimestamp]);

    React.useEffect(() => {
        const listenToStreams = async () => {
            const db = await getDatabaseInstance();
            const streamsRef = ref(db, 'streams');

            onValue(streamsRef, (snapshot) => {
                const data = snapshot.val();
                setStreamCount(data ? Object.keys(data).length : 0);
            });
        };

        listenToStreams();
    }, []);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        try {
            const database = await getDatabaseInstance();
            const messagesRef = ref(database, 'messages');

            // Lấy danh sách tin nhắn hiện tại
            const snapshot = await get(messagesRef);
            const messages = snapshot.val() || {};
            const messageList = Object.entries(messages).map(([id, msg]: [string, any]) => ({
                id,
                timestamp: msg.timestamp
            }));

            // Nếu số tin nhắn vượt quá 100, xóa các tin nhắn cũ
            if (messageList.length >= 100) {
                messageList.sort((a, b) => a.timestamp - b.timestamp);
                const messagesToDelete = messageList.slice(0, messageList.length - 99);

                // Xóa các tin nhắn cũ
                await Promise.all(
                    messagesToDelete.map(msg => remove(ref(database, `messages/${msg.id}`)))
                );
            }

            // Thêm tin nhắn mới
            const newMessageRef = push(messagesRef);
            await set(newMessageRef, {
                text: newMessage,
                timestamp: Date.now()
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const handleCreateFolder = () => {
        onClose();
        onCreateFolder();
    };

    // Thêm hàm kiểm tra và format link
    const formatMessage = (text: string) => {
        // Regex để tìm URL
        const urlRegex = /(https?:\/\/[^\s]+)/g;

        // Tách message thành mảng, phân biệt giữa text thường và URL
        const parts = text.split(urlRegex);

        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 dark:text-blue-400 
                        dark:hover:text-blue-300 underline break-all"
                    >
                        {part}
                    </a>
                );
            }
            return <span key={index} className="break-words">{part}</span>;
        });
    };

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            <div className={`
                fixed md:sticky top-0 md:top-[84px] w-72 
                bg-gradient-to-b from-gray-50 to-white 
                dark:from-gray-800 dark:to-gray-900
                p-4 ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                md:translate-x-0 transition-transform duration-300 ease-out
                z-50 flex flex-col shadow-lg md:shadow-none
                h-[100vh] md:h-[calc(100vh-84px)]
                overflow-y-auto
            `}>
                <div className="flex items-center justify-between mb-6 md:hidden">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Menu</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 
                        text-gray-600 dark:text-gray-400
                        hover:text-gray-900 dark:hover:text-gray-100
                        rounded-xl transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {isLoading ? (
                    <div className="space-y-4">
                        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                        <div className="space-y-3">
                            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                        </div>
                        <div className="mt-6 space-y-3">
                            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                        </div>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={handleCreateFolder}
                            className="flex items-center space-x-3 px-6 py-3.5 rounded-xl 
                            bg-blue-50 dark:bg-blue-900/30 
                            text-blue-600 dark:text-blue-400 
                            hover:bg-blue-100 dark:hover:bg-blue-900/50
                            font-medium transition-all duration-200 mb-4 group"
                        >
                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Tạo Thư Mục</span>
                        </button>

                        <div className="space-y-3">
                            <label
                                htmlFor="fileInput"
                                className="flex items-center space-x-3 px-6 py-3.5 rounded-xl 
                                bg-gray-50 dark:bg-gray-800 
                                text-gray-700 dark:text-gray-300
                                hover:bg-gray-100 dark:hover:bg-gray-700
                                font-medium transition-all duration-200 cursor-pointer group"
                                onClick={onClose}
                            >
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                <span>Tải File Lên</span>
                            </label>

                            <label
                                htmlFor="folderInput"
                                className="flex items-center space-x-3 px-6 py-3.5 rounded-xl 
                                bg-gray-50 dark:bg-gray-800 
                                text-gray-700 dark:text-gray-300
                                hover:bg-gray-100 dark:hover:bg-gray-700
                                font-medium transition-all duration-200 cursor-pointer group"
                                onClick={onClose}
                            >
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <span>Tải Thư Mục Lên</span>
                            </label>
                        </div>

                        {/* Hidden inputs */}
                        <input
                            id="fileInput"
                            type="file"
                            multiple
                            onChange={(e) => {
                                onUploadFile(e);
                                onClose();
                            }}
                            className="hidden"
                            ref={fileInputRef}
                        />
                        <input
                            id="folderInput"
                            type="file"
                            webkitdirectory=""
                            directory=""
                            multiple
                            onChange={(e) => {
                                onUploadFolder(e);
                                onClose();
                            }}
                            className="hidden"
                            ref={folderInputRef}
                        />

                        <div className="mt-6">
                            <div className="flex items-center space-x-3 px-6 py-3.5 rounded-xl hover:bg-gray-100 
                            transition-colors text-gray-700 font-medium">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                <span>DA22TTC</span>
                            </div>

                            <button
                                onClick={() => setIsChatOpen(true)}
                                className="w-full flex items-center justify-between px-6 py-3.5 rounded-xl 
                                hover:bg-gray-100 dark:hover:bg-gray-700
                                transition-colors text-gray-700 dark:text-gray-200 font-medium"
                            >
                                <div className="flex items-center space-x-3">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    <span>Trò Chuyện</span>
                                </div>
                                {unreadCount > 0 && (
                                    <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            <div
                                className="w-full flex items-center justify-between px-6 py-3.5 rounded-xl
                                    hover:bg-gray-100 dark:hover:bg-gray-700
                                    transition-colors text-gray-700 dark:text-gray-200 font-medium cursor-pointer"
                                onClick={() => setIsModalOpen(true)}
                            >
                                <Broadcast isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} />
                                {streamCount > 0 && (
                                    <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs">
                                        {streamCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {driveInfo && !isLoading ? (
                    <div className="mt-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                            Bộ nhớ đã dùng
                        </div>
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-indigo-400 
                                rounded-full transition-all duration-300"
                                style={{ width: `${(driveInfo.used / driveInfo.total) * 100}%` }}
                            />
                        </div>
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            {formatBytes(driveInfo.remaining)} còn trống
                        </div>
                    </div>
                ) : isLoading ? (
                    <div className="mt-auto p-4">
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-2/3 animate-pulse" />
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2 animate-pulse" />
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Chat Modal */}
            {isChatOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end md:items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 w-full h-[100vh] md:h-[80vh] md:max-w-lg md:mx-4 
                        md:rounded-2xl shadow-xl flex flex-col">
                        {/* Header */}
                        <div className="shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Trò Chuyện</h3>
                            <button
                                onClick={() => setIsChatOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Messages Container */}
                        <div className="flex-1 overflow-y-auto p-4 min-h-0">
                            <div className="space-y-4">
                                {messages.slice().reverse().map(msg => (
                                    <div
                                        key={msg.id}
                                        className={`bg-gray-50 dark:bg-gray-700 p-3 rounded-lg
                                            ${!isChatOpen && msg.timestamp > lastSeenTimestamp ? 'border-l-4 border-blue-500' : ''}`}
                                    >
                                        <div className="text-gray-800 dark:text-gray-200 break-words">
                                            {formatMessage(msg.text)}
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(msg.timestamp).toLocaleString()}
                                            </span>
                                            {!isChatOpen && msg.timestamp > lastSeenTimestamp && (
                                                <span className="text-xs text-blue-500 font-medium">
                                                    Mới
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Input Container */}
                        <div className="shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Nhập tin nhắn..."
                                    className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                                    bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                >
                                    Gửi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}