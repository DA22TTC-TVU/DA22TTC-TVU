'use client'
import React, { useState, useEffect, useRef } from 'react';
import { getDatabaseInstance } from '../lib/firebaseConfig';
import { ref, onValue, push, set, get, remove } from 'firebase/database';
import { createPortal } from 'react-dom';
import { GiphyFetch } from '@giphy/js-fetch-api'
import { Grid } from '@giphy/react-components'
import EmojiPicker from 'emoji-picker-react'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { IconPhoto, IconSend, IconX, IconMoodSmile } from '@tabler/icons-react';
import { v4 as uuidv4 } from 'uuid';

export default function Chat() {
    const [messages, setMessages] = useState<{
        id: string;
        text: string;
        timestamp: number;
        type: 'text' | 'sticker' | 'image' | 'gif';
        sender: string | null;
        content?: string;
    }[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastSeenTimestamp, setLastSeenTimestamp] = useState(Date.now());
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const gf = new GiphyFetch('DROIyGjJHVMwXpVs1u0t9oJf69V1MuRU');
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imageLoadingStates, setImageLoadingStates] = useState<boolean[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [gifSearchTerm, setGifSearchTerm] = useState('');
    const [gifSearchResults, setGifSearchResults] = useState<any[]>([]);
    const [gifSearchLoading, setGifSearchLoading] = useState(false);
    const [trendingGifs, setTrendingGifs] = useState<any[]>([]);
    const [trendingLoading, setTrendingLoading] = useState(false);
    const [gifOffset, setGifOffset] = useState(0);
    const [hasMoreGifs, setHasMoreGifs] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const gifLimit = 10;

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
                                timestamp: msg.timestamp,
                                type: msg.type || 'text',
                                sender: msg.sender || 'bot',
                                content: msg.content,
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

    useEffect(() => {
        if (isChatOpen) {
            setTimeout(() => {
                scrollToBottom();
            }, 100);
        }
    }, [isChatOpen]);

    useEffect(() => {
        // Kiểm tra xem userId đã tồn tại trong localStorage chưa
        const storedUserId = localStorage.getItem('chatUserId');
        if (storedUserId) {
            setUserId(storedUserId);
        } else {
            // Nếu chưa có, tạo một userId mới và lưu vào localStorage
            const newUserId = uuidv4();
            localStorage.setItem('chatUserId', newUserId);
            setUserId(newUserId);
        }
    }, []);

    useEffect(() => {
        const fetchTrendingGifs = async () => {
            setTrendingLoading(true);
            try {
                const { data } = await gf.trending({ limit: gifLimit });
                setTrendingGifs(data);
                setHasMoreGifs(true);
                setGifOffset(gifLimit);
            } catch (error) {
                console.error("Error fetching trending GIFs:", error);
                setTrendingGifs([]);
                setHasMoreGifs(false);
            } finally {
                setTrendingLoading(false);
            }
        };

        fetchTrendingGifs();
    }, []);

    const handleGifSearch = async (term: string, offset = 0) => {
        if (!term.trim()) {
            setGifSearchResults([]);
            setHasMoreGifs(true);
            return;
        }

        setGifSearchLoading(true);
        try {
            const { data, pagination } = await gf.search(term, { limit: gifLimit, offset });
            if (offset === 0) {
                setGifSearchResults(data);
            } else {
                setGifSearchResults(prev => [...prev, ...data]);
            }
            setHasMoreGifs(pagination.total_count > offset + gifLimit);
            setGifOffset(offset + gifLimit);
        } catch (error) {
            console.error("Error searching GIFs:", error);
            setGifSearchResults([]);
            setHasMoreGifs(false);
        } finally {
            setGifSearchLoading(false);
        }
    };

    const loadMoreGifs = async () => {
        if (!hasMoreGifs || loadingMore) return;
        setLoadingMore(true);
        try {
            if (gifSearchTerm) {
                await handleGifSearch(gifSearchTerm, gifOffset);
            } else {
                const { data } = await gf.trending({ limit: gifLimit, offset: gifOffset });
                setTrendingGifs(prev => [...prev, ...data]);
                setHasMoreGifs(data.length === gifLimit);
                setGifOffset(gifOffset + gifLimit);
            }
        } catch (error) {
            console.error("Error loading more GIFs:", error);
            setHasMoreGifs(false);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleSendMessage = async (type: 'text' | 'sticker' | 'image' | 'gif' = 'text', content?: string) => {
        if (type === 'text' && !newMessage.trim() && selectedImages.length === 0) return;

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

            // Gửi tin nhắn văn bản nếu có
            if (newMessage.trim()) {
                const newMessageRef = push(messagesRef);
                const messageData: any = {
                    text: newMessage,
                    timestamp: Date.now(),
                    type: 'text',
                    sender: userId, // Sử dụng userId để xác định người gửi
                };
                await set(newMessageRef, messageData);
            }

            // Gửi từng ảnh đã chọn
            for (const image of selectedImages) {
                const storage = getStorage();
                const imageRef = storageRef(storage, `chat-images/${Date.now()}-${image.name}`);
                await uploadBytes(imageRef, image);
                const downloadURL = await getDownloadURL(imageRef);

                const newMessageRef = push(messagesRef);
                const messageData: any = {
                    text: '',
                    timestamp: Date.now(),
                    type: 'image',
                    sender: userId, // Sử dụng userId để xác định người gửi
                    content: downloadURL,
                };
                await set(newMessageRef, messageData);
            }

            setNewMessage('');
            setImagePreviews([]);
            setSelectedImages([]);
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

    // Thêm hàm upload ảnh
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const loadingPromises: Promise<void>[] = [];

        for (const file of files) {
            if (file.type.startsWith('image/')) {
                // Xử lý ảnh
                if (file.size <= 5 * 1024 * 1024) {
                    setImageLoadingStates((prev) => [...prev, true]); // Bắt đầu loading
                    setSelectedImages((prev) => [...prev, file]);

                    const loadingPromise = new Promise<void>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            setImagePreviews((prev) => [...prev, reader.result as string]);
                            resolve();
                        };
                        reader.readAsDataURL(file);
                    });
                    loadingPromises.push(loadingPromise);
                } else {
                    console.error('Ảnh vượt quá giới hạn 5MB');
                }
            }
        }

        Promise.all(loadingPromises).then(() => {
            // Cập nhật trạng thái loading sau khi tất cả đã load xong
            setImageLoadingStates(Array(selectedImages.length).fill(false));
        });
    };

    // Thêm hàm xử lý chọn GIF
    const handleGifSelect = async (gif: any, e: any) => {
        e?.preventDefault();
        try {
            const database = await getDatabaseInstance();
            const messagesRef = ref(database, 'messages');
            const newMessageRef = push(messagesRef);

            const messageData = {
                text: '',
                timestamp: Date.now(),
                type: 'gif',
                sender: userId,
                content: gif.images.original.url
            };

            await set(newMessageRef, messageData);
            setShowGifPicker(false);
            setShowEmojiPicker(false);
            setGifSearchTerm('');
            setGifSearchResults([]);
        } catch (error) {
            console.error("Error sending GIF:", error);
        }
    };

    // Thêm hàm xử lý chọn emoji
    const handleEmojiSelect = async (emojiData: any) => {
        setNewMessage(prev => prev + emojiData.emoji);
        setShowGifPicker(false);
    };

    const handleRemoveImage = (index: number) => {
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
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
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 w-full h-full md:h-[85vh] md:w-[60vw] max-w-[1200px] 
                        md:rounded-2xl shadow-xl flex flex-col">
                        {/* Header */}
                        <div className="shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 
                            flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-2xl">
                            <div className="flex items-center gap-4">
                                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                                    Trò Chuyện
                                </h3>
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 
                                    text-blue-600 dark:text-blue-400 rounded-full">Beta</span>
                            </div>
                            <button
                                onClick={() => setIsChatOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full
                                    transition-colors duration-200"
                            >
                                <IconX className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages Container - Tối ưu hiển thị */}
                        <div className="flex-1 overflow-y-auto p-4 min-h-0 bg-gray-50 dark:bg-gray-900">
                            <div className="space-y-4  mx-auto w-full">
                                {messages.slice().reverse().map(msg => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.sender === userId ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[70%] ${msg.sender === userId ? 'order-1' : 'order-2'}`}>
                                            <div className={`p-3 rounded-2xl shadow-sm
                                                ${msg.sender === userId
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'}`}
                                            >
                                                {msg.type === 'text' && (
                                                    <div className="text-[15px] leading-relaxed">
                                                        {formatMessage(msg.text)}
                                                    </div>
                                                )}
                                                {(msg.type === 'image' || msg.type === 'gif') && msg.content && (
                                                    <div className="relative">
                                                        {msg.content.split(',').map((url, index) => (
                                                            <img
                                                                key={index}
                                                                src={url}
                                                                alt={msg.type === 'image' ? "Image" : "GIF"}
                                                                className="rounded-lg max-w-full h-auto max-h-[300px] object-contain mb-2"
                                                                loading="lazy"
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`mt-1 text-xs text-gray-500 dark:text-gray-400
                                                ${msg.sender === userId ? 'text-right' : 'text-left'}`}>
                                                {new Date(msg.timestamp).toLocaleString('vi-VN', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Input Container */}
                        <div className="shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl relative">
                            {/* Image Preview */}
                            {imagePreviews.length > 0 && (
                                <div className="mb-2 flex gap-2 overflow-x-auto">
                                    {imagePreviews.map((preview, index) => (
                                        <div key={index} className="relative w-24 h-24 rounded-lg shadow-md">
                                            {imageLoadingStates[index] ? (
                                                <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700 
                                                    flex items-center justify-center rounded-lg">
                                                    <svg className="animate-spin h-6 w-6 text-gray-500"
                                                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                </div>
                                            ) : (
                                                <img
                                                    src={preview}
                                                    alt={`Preview ${index}`}
                                                    className="w-full h-full object-cover rounded-lg"
                                                />
                                            )}
                                            {!imageLoadingStates[index] && (
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
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* Pickers */}
                            {showEmojiPicker && (
                                <div className="absolute bottom-full mb-2 left-0 z-10">
                                    <div className="shadow-xl rounded-xl overflow-hidden">
                                        <EmojiPicker
                                            onEmojiClick={handleEmojiSelect}
                                            lazyLoadEmojis={true}
                                        />
                                    </div>
                                </div>
                            )}

                            {showGifPicker && (
                                <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 
                                    p-4 rounded-xl shadow-xl w-[320px] h-[400px] overflow-y-auto z-10">
                                    <div className="mb-2">
                                        <input
                                            type="text"
                                            placeholder="Tìm kiếm GIF..."
                                            value={gifSearchTerm}
                                            onChange={(e) => setGifSearchTerm(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleGifSearch(gifSearchTerm)}
                                            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600
                                                bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200
                                                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                                transition-all duration-200"
                                        />
                                    </div>
                                    {gifSearchLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <svg className="animate-spin h-8 w-8 text-gray-500"
                                                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        </div>
                                    ) : (
                                        <Grid
                                            width={300}
                                            columns={2}
                                            fetchGifs={async (offset: number) => {
                                                if (gifSearchTerm) {
                                                    const result = await gf.search(gifSearchTerm, {
                                                        limit: gifLimit,
                                                        offset
                                                    });
                                                    return { ...result, meta: { status: 200, msg: '', response_id: '' } };
                                                } else {
                                                    const result = await gf.trending({
                                                        limit: gifLimit,
                                                        offset
                                                    });
                                                    return { ...result, meta: { status: 200, msg: '', response_id: '' } };
                                                }
                                            }}
                                            onGifClick={handleGifSelect}
                                            noLink={true}
                                            hideAttribution={true}
                                        />
                                    )}
                                </div>
                            )}

                            {/* Input Controls */}
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg
                                            transition-colors duration-200"
                                        title="Chọn emoji"
                                    >
                                        <IconMoodSmile className="w-5 h-5" />
                                    </button>

                                    <button
                                        onClick={() => setShowGifPicker(!showGifPicker)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg
                                            transition-colors duration-200 font-medium"
                                        title="Chọn GIF"
                                    >
                                        GIF
                                    </button>

                                    <label className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg
                                        transition-colors duration-200 cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                        <IconPhoto className="w-5 h-5" />
                                    </label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Nhập tin nhắn của bạn..."
                                            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600
                                                bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200
                                                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                                transition-all duration-200"
                                        />
                                        {newMessage.trim() && (
                                            <button
                                                onClick={() => setNewMessage('')}
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2
                                                    p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600
                                                    transition-colors duration-200"
                                                title="Xóa tin nhắn"
                                            >
                                                <IconX className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handleSendMessage('text')}
                                        className="p-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600
                                            transition-colors duration-200"
                                        title="Gửi tin nhắn"
                                    >
                                        <IconSend className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}