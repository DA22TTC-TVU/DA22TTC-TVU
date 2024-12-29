'use client'
import React, { useState, useEffect } from 'react';
import { getDatabaseInstance } from '../lib/firebaseConfig';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { createPortal } from 'react-dom';
import 'react-quill/dist/quill.snow.css';

import dynamic from 'next/dynamic';

// Dynamic imports
const Modal = dynamic(() =>
    import('./Modal').then((mod) => ({
        default: ({ children, ...props }) => createPortal(children, document.body)
    })),
    { ssr: false }
);

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface Notification {
    id: string;
    title: string;
    content: string;
    timestamp: number;
    important: boolean;
    attachments?: {
        name: string;
        url: string;
    }[];
}

export default function Notification() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [newNotification, setNewNotification] = useState({
        title: '',
        content: '',
        important: false,
        attachments: [] as { name: string; url: string; }[]
    });
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastReadTimestamp, setLastReadTimestamp] = useState(Date.now());
    const [viewMode, setViewMode] = useState<'list' | 'detail' | 'create'>('list');
    const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'important'>('newest');
    const [showOnlyImportant, setShowOnlyImportant] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Cấu hình ReactQuill
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'image'],
            ['clean']
        ],
    };

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'bullet', 'indent',
        'link', 'image'
    ];

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        const fetchNotifications = async () => {
            const db = await getDatabaseInstance();
            const notificationsRef = ref(db, 'notifications');

            onValue(notificationsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const notificationsList = Object.entries(data).map(([id, n]: [string, any]) => ({
                        id,
                        ...n
                    }));
                    setNotifications(notificationsList.sort((a, b) => b.timestamp - a.timestamp));

                    // Cập nhật số thông báo chưa đọc
                    const unread = notificationsList.filter(n => n.timestamp > lastReadTimestamp).length;
                    setUnreadCount(unread);
                } else {
                    setNotifications([]);
                    setUnreadCount(0);
                }
            });
        };

        fetchNotifications();
    }, [lastReadTimestamp]);

    const handleCreateNotification = async () => {
        if (!newNotification.title.trim() || !newNotification.content.trim()) return;

        const db = await getDatabaseInstance();
        const notificationsRef = ref(db, 'notifications');
        const newNotificationRef = push(notificationsRef);

        await set(newNotificationRef, {
            ...newNotification,
            timestamp: Date.now()
        });

        setNewNotification({
            title: '',
            content: '',
            important: false,
            attachments: []
        });
        setViewMode('list'); // Quay lại danh sách sau khi tạo
    };

    const handleDeleteNotification = async (id: string) => {
        const db = await getDatabaseInstance();
        await remove(ref(db, `notifications/${id}`));
    };

    const markAllAsRead = () => {
        setLastReadTimestamp(Date.now());
        setUnreadCount(0);
    };

    const handleViewNotification = (notification: Notification) => {
        setCurrentNotification(notification);
        setViewMode('detail');
    };

    const NotificationDetail = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <button
                    onClick={() => setViewMode('list')}
                    className="flex items-center gap-2 text-blue-500 hover:text-blue-600"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Quay lại
                </button>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(currentNotification?.timestamp || 0).toLocaleString()}
                </div>
            </div>

            {/* Notification content */}
            <div className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-semibold">
                    {currentNotification?.title}
                </h2>
                <div
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: currentNotification?.content || '' }}
                />
            </div>
            {currentNotification?.attachments && currentNotification.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                    {currentNotification.attachments.map((attachment, index) => (
                        <a
                            key={index}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 text-blue-500 hover:text-blue-600"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span>{attachment.name}</span>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );

    const NotificationCreateForm = () => {
        // Tách state ra khỏi component cha
        const [formData, setFormData] = useState({
            title: '',
            content: '',
            important: false,
            attachments: [] as { name: string; url: string; }[]
        });

        const handleSubmit = async () => {
            if (!formData.title.trim() || !formData.content.trim()) return;

            const db = await getDatabaseInstance();
            const notificationsRef = ref(db, 'notifications');
            const newNotificationRef = push(notificationsRef);

            await set(newNotificationRef, {
                ...formData,
                timestamp: Date.now()
            });

            setFormData({
                title: '',
                content: '',
                important: false,
                attachments: []
            });
            setViewMode('list');
        };

        return (
            <div className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Tiêu đề thông báo"
                    className="w-full p-3 border rounded-lg dark:bg-gray-600 dark:border-gray-500"
                />
                <ReactQuill
                    theme="snow"
                    value={formData.content}
                    onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                    modules={modules}
                    formats={formats}
                    className="bg-white dark:bg-gray-700"
                />
                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        id="important"
                        checked={formData.important}
                        onChange={(e) => setFormData(prev => ({ ...prev, important: e.target.checked }))}
                        className="rounded text-blue-500"
                    />
                    <label htmlFor="important" className="text-gray-700 dark:text-gray-300">
                        Đánh dấu là quan trọng
                    </label>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <button
                        onClick={() => setViewMode('list')}
                        className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        Tạo thông báo
                    </button>
                </div>
            </div>
        );
    };

    // Hàm lọc và sắp xếp thông báo
    const filteredNotifications = notifications
        .filter(n => {
            const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                n.content.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesImportant = !showOnlyImportant || n.important;
            return matchesSearch && matchesImportant;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'important':
                    return (b.important === a.important) ? 0 : b.important ? 1 : -1;
                default: // newest
                    return b.timestamp - a.timestamp;
            }
        });

    return (
        <>
            <button
                onClick={() => {
                    setIsModalOpen(true);
                    markAllAsRead();
                }}
                className="w-full flex items-center justify-between px-6 py-3.5 rounded-xl 
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors text-gray-700 dark:text-gray-200 font-medium"
            >
                <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span>Thông Báo</span>
                </div>
                {unreadCount > 0 && (
                    <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isModalOpen && (
                <Modal>
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
                            {/* Header với thanh tìm kiếm */}
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between gap-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Thông Báo</h3>
                                <div className="flex items-center gap-4">
                                    <div className="relative flex-1 sm:flex-none">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Tìm kiếm..."
                                            className="w-full sm:w-auto px-4 py-2 pr-10 rounded-lg bg-gray-100 
                                                     dark:bg-gray-700 border-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <svg className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <button onClick={() => setIsModalOpen(false)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Toolbar */}
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 
                                          flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                <div className="flex flex-wrap gap-4 items-center w-full sm:w-auto">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as 'newest' | 'important')}
                                        className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-none 
                                                 focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="newest">Mới nhất</option>
                                        <option value="important">Quan trọng</option>
                                    </select>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="showImportant"
                                            checked={showOnlyImportant}
                                            onChange={(e) => setShowOnlyImportant(e.target.checked)}
                                            className="rounded border-gray-300 dark:border-gray-600 
                                                     text-blue-500 focus:ring-blue-500"
                                        />
                                        <label htmlFor="showImportant"
                                            className="text-sm text-gray-600 dark:text-gray-300">
                                            Chỉ hiện thông báo quan trọng
                                        </label>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setViewMode('create')}
                                    className="w-full sm:w-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 
                                             text-white rounded-lg flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span>Tạo thông báo mới</span>
                                </button>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {viewMode === 'list' ? (
                                    <div className="space-y-4">
                                        {filteredNotifications.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                {searchQuery ? 'Không tìm thấy thông báo phù hợp' : 'Chưa có thông báo nào'}
                                            </div>
                                        ) : (
                                            filteredNotifications.map(notification => (
                                                <div
                                                    key={notification.id}
                                                    className={`p-4 rounded-lg transition-all duration-200 
                                                        ${notification.important
                                                            ? 'bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500'
                                                            : 'bg-gray-50 dark:bg-gray-700'}`}
                                                >
                                                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                                                        <div className="space-y-2 flex-1">
                                                            <h4
                                                                onClick={() => handleViewNotification(notification)}
                                                                className="text-lg sm:text-xl font-semibold hover:text-blue-500 
                                                                         cursor-pointer transition-colors"
                                                            >
                                                                {notification.title}
                                                            </h4>
                                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 
                                                                          text-sm text-gray-500 dark:text-gray-400">
                                                                <span className="flex items-center gap-1">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                                        viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                    {new Date(notification.timestamp).toLocaleDateString()}
                                                                </span>
                                                                {notification.attachments && notification.attachments.length > 0 && (
                                                                    <span className="flex items-center gap-1">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                                            viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                                        </svg>
                                                                        {notification.attachments.length} tệp đính kèm
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteNotification(notification.id)}
                                                            className="text-gray-500 hover:text-red-500 transition-colors"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor"
                                                                viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ) : viewMode === 'create' ? (
                                    <NotificationCreateForm />
                                ) : (
                                    <NotificationDetail />
                                )}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
} 