'use client'
import React, { useState, useEffect, useRef } from 'react';
import { getDatabaseInstance } from '../lib/firebaseConfig';
import { ref, onValue, push, set, get, remove } from 'firebase/database';
import { createPortal } from 'react-dom';

export default function Chat() {
    const [messages, setMessages] = useState<{ id: string, text: string, timestamp: number }[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastSeenTimestamp, setLastSeenTimestamp] = useState(Date.now());
    const [isChatOpen, setIsChatOpen] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
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
            {/* Sidebar Button */}
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
                    <span className="flex items-center gap-2">
                        Trò Chuyện
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 
                                            text-blue-600 dark:text-blue-400 rounded">Beta</span>
                    </span>
                </div>
                {unreadCount > 0 && (
                    <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                        {unreadCount}
                    </span>
                )}
            </button>
            {/* Chat Modal */}
            {isChatOpen && createPortal(
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
                </div>,
                document.body
            )}
        </>
    );
}