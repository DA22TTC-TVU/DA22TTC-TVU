'use client'
import React, { useState, useEffect } from 'react';
import { getDatabaseInstance } from '../lib/firebaseConfig';
import { ref, onValue, push, set, get, update } from 'firebase/database';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';
import '../styles/quill-dark.css';

interface Question {
    id: string;
    title: string;
    content: string;
    timestamp: number;
    answers: Answer[];
    solved: boolean;
    author?: string;
    tags?: string[];
    views?: number;
    likes?: number;
}

interface Answer {
    id: string;
    content: string;
    timestamp: number;
    author?: string;
    isAccepted?: boolean;
    likes?: number;
}

export default function QA() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [newQuestion, setNewQuestion] = useState({ title: '', content: '' });
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [newAnswer, setNewAnswer] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [isAskingQuestion, setIsAskingQuestion] = useState(false);
    const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'unsolved'>('newest');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [showOnlyUnsolved, setShowOnlyUnsolved] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);

    useEffect(() => {
        const fetchQuestions = async () => {
            const db = await getDatabaseInstance();
            const questionsRef = ref(db, 'questions');

            onValue(questionsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const questionsList = Object.entries(data).map(([id, q]: [string, any]) => ({
                        id,
                        ...q,
                        answers: q.answers ? Object.entries(q.answers).map(([aid, a]: [string, any]) => ({
                            id: aid,
                            ...a
                        })) : []
                    }));
                    setQuestions(questionsList.sort((a, b) => b.timestamp - a.timestamp));

                    // Cập nhật số câu hỏi chưa giải quyết
                    const unsolved = questionsList.filter(q => !q.solved).length;
                    setUnreadCount(unsolved);
                } else {
                    setQuestions([]);
                    setUnreadCount(0);
                }
            });
        };

        fetchQuestions();
    }, []);

    const handleAskQuestion = async () => {
        if (!newQuestion.title.trim() || !newQuestion.content.trim()) return;

        const db = await getDatabaseInstance();
        const questionsRef = ref(db, 'questions');
        const newQuestionRef = push(questionsRef);

        await set(newQuestionRef, {
            ...newQuestion,
            timestamp: Date.now(),
            solved: false,
            views: 0,
            likes: 0
        });

        setNewQuestion({ title: '', content: '' });
        setIsAskingQuestion(false);
    };

    const handleAnswer = async (questionId: string) => {
        if (!newAnswer.trim()) return;

        const db = await getDatabaseInstance();
        const answerRef = push(ref(db, `questions/${questionId}/answers`));
        const newAnswerData = {
            content: newAnswer,
            timestamp: Date.now(),
            likes: 0
        };

        await set(answerRef, newAnswerData);

        // Cập nhật UI ngay lập tức
        if (currentQuestion) {
            const updatedAnswers = [...(currentQuestion.answers || []), {
                id: answerRef.key as string,
                ...newAnswerData
            }];
            setCurrentQuestion({
                ...currentQuestion,
                answers: updatedAnswers
            });
        }

        setNewAnswer('');
        setSelectedQuestion(null);
    };

    const markAsSolved = async (questionId: string) => {
        const db = await getDatabaseInstance();
        await set(ref(db, `questions/${questionId}/solved`), true);

        // Cập nhật UI và đóng modal chi tiết
        setQuestions(prev =>
            prev.map(q =>
                q.id === questionId
                    ? { ...q, solved: true }
                    : q
            )
        );
        setViewMode('list');
        setCurrentQuestion(null);
    };

    // Thêm cấu hình cho Quill
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image'],
            ['clean']
        ],
    };

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'list', 'bullet',
        'link', 'image'
    ];

    // Thêm hàm để toggle câu hỏi
    const toggleQuestion = (questionId: string) => {
        setExpandedQuestionId(expandedQuestionId === questionId ? null : questionId);
    };

    // Hàm lọc và sắp xếp câu hỏi
    const filteredQuestions = questions
        .filter(q => {
            const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                q.content.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesTags = selectedTags.length === 0 ||
                (q.tags && selectedTags.every(tag => q.tags?.includes(tag)));
            const matchesSolved = !showOnlyUnsolved || !q.solved;
            return matchesSearch && matchesTags && matchesSolved;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'popular':
                    return (b.views || 0) - (a.views || 0);
                case 'unsolved':
                    return (a.solved === b.solved) ? 0 : a.solved ? 1 : -1;
                default: // newest
                    return b.timestamp - a.timestamp;
            }
        });

    // Hàm tăng lượt xem
    const incrementViews = async (questionId: string) => {
        const db = await getDatabaseInstance();
        const questionRef = ref(db, `questions/${questionId}`);

        // Lấy số lượt xem hiện tại
        const snapshot = await get(questionRef);
        const currentViews = (snapshot.val()?.views || 0) + 1;

        // Cập nhật lượt xem mới
        await update(questionRef, { views: currentViews });
    };

    // Hàm xem chi tiết câu hỏi
    const handleViewQuestion = async (question: Question) => {
        setCurrentQuestion(question);
        setViewMode('detail');
        await incrementViews(question.id);
    };

    // Thêm hàm xử lý like
    const handleLike = async (type: 'question' | 'answer', id: string, parentId?: string) => {
        const db = await getDatabaseInstance();
        let likeRef;

        if (type === 'question') {
            likeRef = ref(db, `questions/${id}/likes`);
        } else if (parentId) {
            likeRef = ref(db, `questions/${parentId}/answers/${id}/likes`);
        }

        if (likeRef) {
            const snapshot = await get(likeRef);
            const currentLikes = (snapshot.val() || 0) + 1;
            await update(ref(db, type === 'question' ? `questions/${id}` : `questions/${parentId}/answers/${id}`), { likes: currentLikes });

            // Cập nhật UI
            if (type === 'question') {
                setQuestions(prev =>
                    prev.map(q =>
                        q.id === id
                            ? { ...q, likes: currentLikes }
                            : q
                    )
                );
                if (currentQuestion?.id === id) {
                    setCurrentQuestion(prev => prev ? { ...prev, likes: currentLikes } : null);
                }
            } else if (currentQuestion && parentId) {
                const updatedAnswers = currentQuestion.answers.map(a =>
                    a.id === id
                        ? { ...a, likes: currentLikes }
                        : a
                );
                setCurrentQuestion({ ...currentQuestion, answers: updatedAnswers });
            }
        }
    };

    // Component hiển thị chi tiết câu hỏi
    const QuestionDetail = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setViewMode('list')}
                        className="flex items-center gap-2 text-blue-500 hover:text-blue-600"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="hidden sm:inline">Quay lại</span>
                    </button>
                    {!currentQuestion?.solved && (
                        <button
                            onClick={() => currentQuestion && markAsSolved(currentQuestion.id)}
                            className="flex items-center gap-2 text-green-500 hover:text-green-600"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="hidden sm:inline">Đánh dấu hoàn thành</span>
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{currentQuestion?.views || 0} lượt xem</span>
                    <span className="hidden sm:inline">
                        {new Date(currentQuestion?.timestamp || 0).toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Question content với like */}
            <div className="space-y-4">
                <div className="flex justify-between items-start gap-4">
                    <h2 className="text-xl sm:text-2xl font-semibold flex-1">
                        {currentQuestion?.title}
                    </h2>
                    <button
                        onClick={() => currentQuestion && handleLike('question', currentQuestion.id)}
                        className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        <span>{typeof currentQuestion?.likes === 'number' ? currentQuestion.likes : 0}</span>
                    </button>
                </div>
                <div
                    className="prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: currentQuestion?.content || '' }}
                />
            </div>

            {/* Answers section cải tiến */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-lg sm:text-xl font-semibold">
                        Câu trả lời ({currentQuestion?.answers?.length || 0})
                    </h3>
                    <button
                        onClick={() => setSelectedQuestion(currentQuestion)}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg 
                                 hover:bg-blue-600 flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Thêm câu trả lời
                    </button>
                </div>

                <div className="grid gap-4 sm:gap-6">
                    {currentQuestion?.answers?.map(answer => (
                        <div
                            key={answer.id}
                            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div
                                    className="prose dark:prose-invert max-w-none flex-1"
                                    dangerouslySetInnerHTML={{ __html: answer.content }}
                                />
                                <button
                                    onClick={() => currentQuestion &&
                                        handleLike('answer', answer.id, currentQuestion.id)}
                                    className="flex items-center gap-2 text-gray-500 hover:text-blue-500 
                                             transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor"
                                        viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                    </svg>
                                    <span>{typeof answer.likes === 'number' ? answer.likes : 0}</span>
                                </button>
                            </div>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center 
                                          text-sm text-gray-500 dark:text-gray-400 gap-2">
                                <span>{new Date(answer.timestamp).toLocaleString()}</span>
                                {answer.author && <span>Bởi: {answer.author}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="w-full flex items-center justify-between px-6 py-3.5 rounded-xl 
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors text-gray-700 dark:text-gray-200 font-medium"
            >
                <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Hỏi Đáp</span>
                </div>
                {unreadCount > 0 && (
                    <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between gap-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Hỏi Đáp</h3>
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

                        {/* Toolbar - Responsive */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 
                                      flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            <div className="flex flex-wrap gap-4 items-center w-full sm:w-auto">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as 'newest' | 'popular' | 'unsolved')}
                                    className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border-none 
                                             focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="newest">Mới nhất</option>
                                    <option value="popular">Phổ biến nhất</option>
                                    <option value="unsolved">Chưa giải quyết</option>
                                </select>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="showUnsolved"
                                        checked={showOnlyUnsolved}
                                        onChange={(e) => setShowOnlyUnsolved(e.target.checked)}
                                        className="rounded border-gray-300 dark:border-gray-600 
                                                 text-blue-500 focus:ring-blue-500"
                                    />
                                    <label htmlFor="showUnsolved"
                                        className="text-sm text-gray-600 dark:text-gray-300">
                                        Chưa giải quyết
                                    </label>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsAskingQuestion(true)}
                                className="w-full sm:w-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 
                                         text-white rounded-lg flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Đặt câu hỏi</span>
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {isAskingQuestion ? (
                                // Form đặt câu hỏi
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        value={newQuestion.title}
                                        onChange={(e) => setNewQuestion(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="Tiêu đề câu hỏi"
                                        className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 border-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <ReactQuill
                                        theme="snow"
                                        value={newQuestion.content}
                                        onChange={(content) => setNewQuestion(prev => ({ ...prev, content }))}
                                        modules={modules}
                                        formats={formats}
                                        className="bg-white dark:bg-gray-700"
                                    />
                                    <div className="flex justify-end gap-2 pt-4">
                                        <button
                                            onClick={() => setIsAskingQuestion(false)}
                                            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            onClick={handleAskQuestion}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                        >
                                            Đăng câu hỏi
                                        </button>
                                    </div>
                                </div>
                            ) : selectedQuestion ? (
                                // Form trả lời
                                <div className="space-y-4">
                                    <h3 className="font-medium text-lg">
                                        Trả lời cho: {selectedQuestion.title}
                                    </h3>
                                    <ReactQuill
                                        theme="snow"
                                        value={newAnswer}
                                        onChange={setNewAnswer}
                                        modules={modules}
                                        formats={formats}
                                        className="bg-white dark:bg-gray-700"
                                    />
                                    <div className="flex justify-end gap-2 pt-4">
                                        <button
                                            onClick={() => setSelectedQuestion(null)}
                                            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            onClick={() => handleAnswer(selectedQuestion.id)}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                                        >
                                            Gửi câu trả lời
                                        </button>
                                    </div>
                                </div>
                            ) : viewMode === 'detail' ? (
                                <QuestionDetail />
                            ) : (
                                // Danh sách câu hỏi
                                <div className="space-y-4">
                                    {filteredQuestions.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                            {searchQuery ? 'Không tìm thấy câu hỏi phù hợp' : 'Chưa có câu hỏi nào'}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {filteredQuestions.map(question => (
                                                <div
                                                    key={question.id}
                                                    className={`p-4 rounded-lg transition-all duration-200 
                                                        ${question.solved
                                                            ? 'bg-green-50 dark:bg-green-900/30'
                                                            : 'bg-gray-50 dark:bg-gray-700'}`}
                                                >
                                                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                                                        <div className="space-y-2 flex-1">
                                                            <h4
                                                                onClick={() => handleViewQuestion(question)}
                                                                className="text-lg sm:text-xl font-semibold hover:text-blue-500 
                                                                         cursor-pointer transition-colors"
                                                            >
                                                                {question.title}
                                                            </h4>
                                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 
                                                                          text-sm text-gray-500 dark:text-gray-400">
                                                                <span className="flex items-center gap-1">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                                        viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                    {new Date(question.timestamp).toLocaleDateString()}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                    {question.views || 0} lượt xem
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                                        viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                            d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                                                    </svg>
                                                                    {typeof question.likes === 'number' ? question.likes : 0} lượt thích
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                                        viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                                    </svg>
                                                                    {question.answers?.length || 0} câu trả lời
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => handleLike('question', question.id)}
                                                                className="text-gray-500 hover:text-blue-500 transition-colors"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor"
                                                                    viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                        d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                                                </svg>
                                                            </button>
                                                            {question.solved && (
                                                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900 
                                                                               text-green-600 dark:text-green-400 rounded-full text-sm">
                                                                    Đã giải quyết
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
} 