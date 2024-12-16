'use client'
import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { getDatabaseInstance } from '../../lib/firebaseConfig';
import TextareaAutosize from 'react-textarea-autosize';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faTrash, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
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
        }
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
                        <li key={note.id} className="p-2 bg-gray-100 rounded relative">
                            <div className="flex justify-between items-start">
                                <pre className="flex-1">
                                    <code
                                        className="hljs"
                                        dangerouslySetInnerHTML={{
                                            __html: hljs.highlightAuto(note.content).value
                                        }}
                                    />
                                </pre>
                                <div className="flex flex-col space-y-2 ml-4">
                                    <button
                                        onClick={() => handleCopy(note.content)}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        <FontAwesomeIcon icon={faCopy} size="lg" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteNote(note.id)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        <FontAwesomeIcon icon={faTrash} size="lg" />
                                    </button>
                                </div>
                            </div>
                            <div className="text-sm text-gray-500 mt-2">{new Date(note.timestamp).toLocaleString()}</div>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
};

export default NotePage;
