'use client'
import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { getDatabaseInstance } from '../../lib/firebaseConfig';
import TextareaAutosize from 'react-textarea-autosize';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faTrash, faArrowLeft, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';

const NotePage = () => {
    const router = useRouter();
    const [notes, setNotes] = useState<{ id: string; content: any; timestamp: number }[]>([]);
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [expandedNotes, setExpandedNotes] = useState<{ [key: string]: boolean }>({});
    const [deleteMode, setDeleteMode] = useState<string | null>(null);
    const [deleteCode, setDeleteCode] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const database = await getDatabaseInstance();
                const notesRef = ref(database, 'notes');
                const unsubscribe = onValue(notesRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        const notesList = Object.entries(data).map(([id, note]: [string, any]) => ({
                            id,
                            content: note.content,
                            timestamp: note.timestamp
                        }));
                        notesList.sort((a, b) => b.timestamp - a.timestamp);
                        setNotes(notesList);
                    } else {
                        setNotes([]);
                    }
                    setLoading(false);
                });
                return () => unsubscribe();
            } catch (error) {
                console.error('Firebase error:', error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleAddNote = async () => {
        if (newNote.trim()) {
            const database = await getDatabaseInstance();
            const notesRef = ref(database, 'notes');
            const newNoteRef = push(notesRef);
            await set(newNoteRef, {
                content: newNote,
                timestamp: Date.now()
            });
            setNewNote('');
        }
    };

    const handleDeleteNote = async (id: string) => {
        const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa ghi chú này không?');
        if (confirmDelete) {
            const database = await getDatabaseInstance();
            const noteRef = ref(database, `notes/${id}`);
            await remove(noteRef);
            toast.success('Đã xóa ghi chú!');
        }
        setDeleteMode(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAddNote();
        }
    };

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content);
        toast.success('Đã sao chép ghi chú!', {
            duration: 2000,
            position: 'bottom-right',
            style: {
                background: '#333',
                color: '#fff'
            },
        });
    };

    const handleGoBack = () => {
        router.push('/');
    };

    const toggleNoteExpansion = (id: string) => {
        setExpandedNotes(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const countLines = (text: string): number => {
        return text.split('\n').length;
    };

    const handleNoteClick = (content: string, id: string) => {
        if (deleteMode === id) {
            if (deleteCode.trim().toUpperCase() === 'XOA') {
                handleDeleteNote(id);
            }
            setDeleteMode(null);
            setDeleteCode('');
        } else {
            navigator.clipboard.writeText(content);
            toast.success('Đã sao chép ghi chú!', {
                duration: 2000,
                position: 'bottom-right',
                style: {
                    background: '#333',
                    color: '#fff'
                },
            });
        }
    };

    useEffect(() => {
        if (deleteMode) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [deleteMode]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
            <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <button
                        onClick={handleGoBack}
                        className="group flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900
                        bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow transition-all duration-200"
                    >
                        <FontAwesomeIcon
                            icon={faArrowLeft}
                            className="group-hover:-translate-x-1 transition-transform"
                        />
                        <span className="font-medium">Quay lại trang chủ</span>
                    </button>

                    <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                        Ghi chú
                    </h1>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <TextareaAutosize
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Nhập ghi chú mới..."
                        className="w-full p-4 bg-gray-50 rounded-xl font-mono text-gray-700 placeholder-gray-400
                        border-0 focus:ring-2 focus:ring-blue-100 resize-none transition-all duration-200"
                        minRows={3}
                    />
                    <button
                        onClick={handleAddNote}
                        className="w-full mt-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 
                        text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-600 
                        transform active:scale-[0.98] transition-all duration-200"
                    >
                        Thêm ghi chú
                    </button>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <Skeleton count={3} height={150} className="rounded-xl" />
                    ) : (
                        notes.map(note => (
                            <div
                                key={note.id}
                                className={`group bg-white rounded-2xl border border-gray-100 shadow-sm 
                                hover:shadow-md transition-all duration-200 overflow-hidden
                                ${deleteMode === note.id ? 'ring-2 ring-red-100' : ''}`}
                            >
                                <div className="p-4">
                                    <div className="relative">
                                        <pre
                                            className={`overflow-x-auto ${!expandedNotes[note.id] ? 'max-h-[150px] overflow-y-hidden' : ''}`}
                                        >
                                            <code
                                                className="hljs block rounded-xl p-4 bg-gray-900"
                                                dangerouslySetInnerHTML={{
                                                    __html: hljs.highlightAuto(note.content).value
                                                }}
                                            />
                                        </pre>

                                        {countLines(note.content) > 5 && !expandedNotes[note.id] && (
                                            <div className="absolute bottom-0 left-0 right-0 h-20 
                                                bg-gradient-to-t from-gray-900 to-transparent">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleNoteExpansion(note.id);
                                                    }}
                                                    className="absolute bottom-2 left-1/2 -translate-x-1/2
                                                    bg-gray-800 text-gray-300 hover:text-white px-4 py-1 rounded-full
                                                    text-sm font-medium transition-all duration-200"
                                                >
                                                    Xem thêm
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="text-sm text-gray-500">
                                            {new Date(note.timestamp).toLocaleString()}
                                        </span>

                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleCopy(note.content)}
                                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 
                                                rounded-lg transition-colors"
                                            >
                                                <FontAwesomeIcon icon={faCopy} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteMode(note.id);
                                                    setDeleteCode('');
                                                }}
                                                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 
                                                rounded-lg transition-colors"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {deleteMode === note.id && (
                                    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm 
                                        flex items-center justify-center p-4 z-50">
                                        <div className="bg-white p-6 rounded-2xl shadow-lg max-w-sm w-full">
                                            <p className="text-red-500 font-medium mb-4">
                                                Nhập &quot;XOA&quot; để xác nhận xóa ghi chú
                                            </p>
                                            <input
                                                type="text"
                                                value={deleteCode}
                                                onChange={(e) => setDeleteCode(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-xl mb-4
                                                focus:ring-2 focus:ring-red-100 focus:border-red-300"
                                                autoFocus
                                            />
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handleDeleteNote(note.id)}
                                                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl
                                                    hover:bg-red-600 transition-colors"
                                                >
                                                    Xóa
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setDeleteMode(null);
                                                        setDeleteCode('');
                                                    }}
                                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl
                                                    hover:bg-gray-200 transition-colors"
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
            <Toaster />
        </div>
    );
};

export default NotePage;
