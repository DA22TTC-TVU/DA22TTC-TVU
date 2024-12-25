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

    return (
        <div className="p-4">
            <Toaster />
            <button
                onClick={handleGoBack}
                className="mb-4 text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
                <FontAwesomeIcon icon={faArrowLeft} size="lg" />
                <span>Quay lại trang chủ</span>
            </button>

            <h1 className="text-2xl font-bold mb-4">Ghi chú</h1>
            <div className="flex flex-col gap-2 mb-4">
                <TextareaAutosize
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nhập ghi chú mới"
                    className="w-full p-2 border rounded font-mono"
                    minRows={3}
                />
                <button
                    onClick={handleAddNote}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full"
                >
                    Thêm ghi chú
                </button>
            </div>
            <ul className="space-y-2">
                {loading ? (
                    <Skeleton count={5} height={100} />
                ) : (
                    notes.map(note => (
                        <li
                            key={note.id}
                            className={`p-2 rounded relative cursor-pointer transition-colors ${deleteMode === note.id ? 'bg-red-100 hover:bg-red-200' : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                            onClick={() => handleNoteClick(note.content, note.id)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                setDeleteMode(note.id);
                                setDeleteCode('');
                            }}
                        >
                            <div className="flex justify-between items-start relative">
                                <pre className={`flex-1 overflow-x-auto ${!expandedNotes[note.id] ? 'max-h-[150px] overflow-y-hidden' : ''}`}>
                                    <code
                                        className="hljs block"
                                        dangerouslySetInnerHTML={{
                                            __html: hljs.highlightAuto(note.content).value
                                        }}
                                    />
                                </pre>
                                {countLines(note.content) > 5 && !expandedNotes[note.id] && (
                                    <div
                                        className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-100 to-transparent cursor-pointer flex items-center justify-center"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleNoteExpansion(note.id);
                                        }}
                                    >
                                        <button className="bg-gray-200 hover:bg-gray-300 rounded-full p-2 mt-8">
                                            <FontAwesomeIcon icon={faChevronDown} size="lg" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            {countLines(note.content) > 5 && expandedNotes[note.id] && (
                                <div className="flex justify-center mt-4">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleNoteExpansion(note.id);
                                        }}
                                        className="bg-gray-200 hover:bg-gray-300 rounded-full p-2"
                                    >
                                        <FontAwesomeIcon icon={faChevronUp} size="lg" />
                                    </button>
                                </div>
                            )}
                            <div className="text-sm text-gray-500 mt-2">{new Date(note.timestamp).toLocaleString()}</div>

                            {/* Delete mode overlay */}
                            {deleteMode === note.id && (
                                <div
                                    className="absolute top-0 left-0 right-0 bottom-0 bg-red-100/50 backdrop-blur-sm flex items-center justify-center"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="bg-white p-4 rounded shadow-lg">
                                        <p className="text-red-500 mb-2">Nhập Mã Xóa:</p>
                                        <input
                                            type="text"
                                            value={deleteCode}
                                            onChange={(e) => setDeleteCode(e.target.value)}
                                            className="border p-2 w-full mb-2 rounded"
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    if (deleteCode.trim().toUpperCase() === 'XOA') {
                                                        handleDeleteNote(note.id);
                                                    }
                                                    setDeleteMode(null);
                                                    setDeleteCode('');
                                                }}
                                                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                                            >
                                                Xóa
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setDeleteMode(null);
                                                    setDeleteCode('');
                                                }}
                                                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                            >
                                                Hủy
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
};

export default NotePage;
