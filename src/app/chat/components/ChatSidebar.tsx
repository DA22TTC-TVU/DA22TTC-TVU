import { useState, useEffect } from 'react';
import { PlusIcon, ChatBubbleLeftIcon, TrashIcon, XMarkIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
interface ChatSession {
    id: string;
    title: string;
    createdAt: string;
    messages: any[]; // Sử dụng type Message của bạn thay vì any
}

interface ChatSidebarProps {
    onNewChat: () => void;
    onSelectChat: (session: ChatSession) => void;
    currentMessages: any[];
    streamingText: any;
    isLoading: any;
}

// Thêm hàm helper để làm việc với IndexedDB
const initDB = async () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ChatDB', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('chatSessions')) {
                db.createObjectStore('chatSessions', { keyPath: 'id' });
            }
        };
    });
};

export default function ChatSidebar({ onNewChat, onSelectChat, currentMessages, streamingText, isLoading }: ChatSidebarProps) {
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string>('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        // Load chat sessions từ IndexedDB khi component mount
        const loadSessions = async () => {
            try {
                const db: any = await initDB();
                const transaction = db.transaction(['chatSessions'], 'readonly');
                const store = transaction.objectStore('chatSessions');
                const request = store.getAll();

                request.onsuccess = () => {
                    const sessions = request.result;
                    setChatSessions(sessions.sort((a: ChatSession, b: ChatSession) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    ));
                };
            } catch (error) {
                console.error('Error loading sessions:', error);
            }
        };

        loadSessions();
    }, []);

    useEffect(() => {
        // Lưu messages vào IndexedDB
        const saveSession = async () => {
            if (currentMessages.length > 0) {
                try {
                    const db: any = await initDB();
                    const transaction = db.transaction(['chatSessions'], 'readwrite');
                    const store = transaction.objectStore('chatSessions');

                    if (!currentSessionId) {
                        const newSession: ChatSession = {
                            id: Date.now().toString(),
                            title: getSessionTitle(currentMessages),
                            createdAt: new Date().toISOString(),
                            messages: currentMessages
                        };
                        setCurrentSessionId(newSession.id);
                        store.add(newSession);
                        setChatSessions(prev => [newSession, ...prev]);
                    } else {
                        const existingSession = chatSessions.find(s => s.id === currentSessionId);
                        const updatedSession: ChatSession = {
                            id: currentSessionId,
                            title: getSessionTitle(currentMessages),
                            messages: currentMessages,
                            createdAt: existingSession?.createdAt ?? new Date().toISOString()
                        };
                        store.put(updatedSession);
                        setChatSessions(prev => prev.map(session =>
                            session.id === currentSessionId ? updatedSession : session
                        ));
                    }
                } catch (error) {
                    console.error('Error saving session:', error);
                }
            }
        };

        saveSession();
    }, [currentMessages, currentSessionId]);

    const getSessionTitle = (messages: any[]) => {
        // Lấy nội dung tin nhắn đầu tiên của user làm title
        const firstUserMessage = messages.find(m => m.role === 'user');
        return firstUserMessage ?
            (firstUserMessage.content.slice(0, 30) + '...') :
            'Cuộc trò chuyện mới';
    };

    const deleteSession = async (sessionId: string) => {
        try {
            const db: any = await initDB();
            const transaction = db.transaction(['chatSessions'], 'readwrite');
            const store = transaction.objectStore('chatSessions');
            store.delete(sessionId);

            setChatSessions(prev => prev.filter(s => s.id !== sessionId));

            if (sessionId === currentSessionId) {
                setCurrentSessionId('');
                onNewChat();
            }
        } catch (error) {
            console.error('Error deleting session:', error);
        }
    };

    const handleNewChat = () => {
        if (isLoading || streamingText) {
            toast.error('Không thể tạo trò chuyện mới khi AI đang trả lời');
            return;
        }
        setCurrentSessionId(''); // Reset currentSessionId khi tạo chat mới
        onNewChat();
    };

    const handleSelectChat = (session: ChatSession) => {
        setCurrentSessionId(session.id);
        onSelectChat(session);
    };

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="fixed top-16 -left-5 z-50 p-2 rounded-r-xl bg-white dark:bg-gray-900 
                    border border-gray-200 dark:border-gray-700
                    shadow-lg lg:hidden
                    transform translate-x-0 transition-transform duration-300 ease-in-out
                    hover:translate-x-1"
            >
                {isSidebarOpen ? (
                    <XMarkIcon className="w-6 h-6" />
                ) : (
                    <Bars3Icon className="w-6 h-6" />
                )}
            </button>

            {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed top-0 left-0 z-40 w-72 h-screen
                transform transition-transform duration-300 ease-in-out
                lg:relative lg:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                bg-white dark:bg-gray-900 
                border-r border-gray-200 dark:border-gray-700
                shadow-lg lg:shadow-none
            `}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handleNewChat}
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl
                                bg-gradient-to-r from-blue-600 to-blue-700
                                hover:from-blue-700 hover:to-blue-800
                                text-white font-medium transition-all duration-200
                                shadow-md hover:shadow-lg"
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span>Cuộc trò chuyện mới</span>
                        </button>
                    </div>

                    {/* Chat List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {chatSessions.map((session) => (
                            <div
                                key={session.id}
                                className={`
                                    group flex items-center justify-between
                                    p-3 rounded-xl cursor-pointer
                                    transition-all duration-200
                                    hover:bg-gray-100 dark:hover:bg-gray-800
                                    ${session.id === currentSessionId ?
                                        'bg-gray-100 dark:bg-gray-800 shadow-md' :
                                        'hover:shadow-md'}
                                `}
                                onClick={() => handleSelectChat(session)}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex-shrink-0">
                                        <ChatBubbleLeftIcon className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {session.title}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(session.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSession(session.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg
                                        hover:bg-red-100 dark:hover:bg-red-900
                                        text-red-500 transition-all duration-200"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                            Tổng số cuộc trò chuyện: {chatSessions.length}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
} 