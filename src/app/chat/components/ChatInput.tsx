// ChatInput.tsx
'use client'
import { useRef, FormEvent, ClipboardEvent, useEffect, useCallback, useMemo } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileImport, faGear, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { SUPPORTED_FILE_TYPES } from '../types/chat';
import { toast } from 'react-hot-toast';
import { useState } from 'react';
import { debounce } from 'lodash';

interface ChatInputProps {
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    isLoading: boolean;
    handleSubmit: (e: FormEvent) => Promise<void>;
    imagePreviews: string[];
    filePreviews: { name: string, type: string }[];
    handleRemoveImage: (index?: number) => void;
    handleRemoveFile: (index: number) => void;
    selectedImages: File[];
    setSelectedImages: React.Dispatch<React.SetStateAction<File[]>>;
    setImagePreviews: React.Dispatch<React.SetStateAction<string[]>>;
    selectedFiles: File[];
    setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
    setFilePreviews: React.Dispatch<React.SetStateAction<{ name: string, type: string }[]>>;
    fileInputKey: number;
    mode: {
        search: boolean;
        speed: boolean;
        image: boolean;
        experiment: boolean;
    };
    setMode: React.Dispatch<React.SetStateAction<{
        search: boolean;
        speed: boolean;
        image: boolean;
        experiment: boolean;
    }>>;
    stopGenerating: (() => void) | null;
    clearChat: () => void;
    selectedModel: string;
    setSelectedModel: React.Dispatch<React.SetStateAction<string>>;
}

const ChatInput: React.FC<ChatInputProps> = ({
    input,
    setInput,
    isLoading,
    handleSubmit,
    imagePreviews,
    filePreviews,
    handleRemoveImage,
    handleRemoveFile,
    selectedImages,
    setSelectedImages,
    setImagePreviews,
    selectedFiles,
    setSelectedFiles,
    setFilePreviews,
    fileInputKey,
    mode,
    setMode,
    stopGenerating,
    clearChat,
    selectedModel,
    setSelectedModel
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageLoadingStates, setImageLoadingStates] = useState<boolean[]>([]);
    const [fileLoadingStates, setFileLoadingStates] = useState<boolean[]>([]);
    const [showModeModal, setShowModeModal] = useState(false);
    const [showModelSelector, setShowModelSelector] = useState(false);
    const [customModel, setCustomModel] = useState('');
    const [showExpandedInput, setShowExpandedInput] = useState(false);

    const availableModels = [
        {
            id: 'deepseek-ai/DeepSeek-V3',
            name: 'DeepSeek V3',
            type: 'text'
        },
        {
            id: 'Qwen/QwQ-32B-Preview',
            name: 'QwQ 32B',
            type: 'text'
        },
        {
            id: 'meta-llama/Llama-3.3-70B-Instruct',
            name: 'Llama 3.3',
            type: 'text'
        },
        {
            id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
            name: 'Qwen Coder',
            type: 'text'
        },
        {
            id: 'FLUX.1-dev',
            name: 'FLUX Dev',
            type: 'image'
        }
    ];

    const debouncedSetInput = useMemo(
        () => debounce((value: string) => {
            setInput(value);
        }, 10),
        [setInput]
    );

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
                    toast.error('Ảnh vượt quá giới hạn 5MB');
                }
            } else {
                // Xử lý file
                if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
                    toast.error(
                        'Định dạng file không được hỗ trợ. Chỉ hỗ trợ PDF, TXT, DOC, DOCX, CSV, MD, HTML, CSS, JS, PY, XML, RTF'
                    );
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                    return;
                }

                if (file.size <= 10 * 1024 * 1024) {
                    setFileLoadingStates((prev) => [...prev, true]); // Bắt đầu loading
                    setSelectedFiles((prev) => [...prev, file]);
                    setFilePreviews((prev) => [...prev, { name: file.name, type: file.type }]);

                    const loadingPromise = new Promise<void>((resolve) => {
                        setTimeout(() => { // Giả lập thời gian load file
                            resolve();
                        }, 1000);
                    });

                    loadingPromises.push(loadingPromise);
                } else {
                    toast.error('Tệp vượt quá giới hạn 10MB');
                }
            }
        }

        Promise.all(loadingPromises).then(() => {
            // Cập nhật trạng thái loading sau khi tất cả đã load xong
            setImageLoadingStates(Array(selectedImages.length).fill(false));
            setFileLoadingStates(Array(selectedFiles.length).fill(false));
        });
    };

    const handlePaste = (e: ClipboardEvent) => {
        // Không cho phép dán ảnh trong chế độ speed
        if (mode.speed) {
            return;
        }

        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file && file.size <= 5 * 1024 * 1024) {
                    setSelectedImages(prev => [...prev, file]);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setImagePreviews(prev => [...prev, reader.result as string]);
                    };
                    reader.readAsDataURL(file);
                } else if (file) {
                    toast.error('Ảnh vượt quá giới hạn 5MB');
                }
            }
        }
    };

    useEffect(() => {
        const handleDocumentPaste = (e: globalThis.ClipboardEvent) => handlePaste(e as any);
        document.addEventListener('paste', handleDocumentPaste);
        return () => {
            document.removeEventListener('paste', handleDocumentPaste);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const modal = document.getElementById('mode-modal');
            const button = document.getElementById('mode-button');
            if (modal && button &&
                !modal.contains(event.target as Node) &&
                !button.contains(event.target as Node)) {
                setShowModeModal(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleModeChange = (modeType: 'search' | 'speed' | 'image' | 'experiment') => {
        setMode(prev => {
            const newMode = {
                search: modeType === 'search' ? !prev.search : false,
                speed: modeType === 'speed' ? !prev.speed : false,
                image: modeType === 'image' ? !prev.image : false,
                experiment: modeType === 'experiment' ? !prev.experiment : false,
            };

            // Nếu bật chế độ speed hoặc experiment, xóa tất cả ảnh và file đã tải lên
            if ((modeType === 'speed' && !prev.speed) || (modeType === 'experiment' && !prev.experiment)) {
                handleRemoveImage();
                setSelectedFiles([]);
                setFilePreviews([]);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }

            return newMode;
        });
    };

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const lineCount = (value.match(/\n/g) || []).length + 1;

        if (lineCount > 1 && !showExpandedInput) {
            setShowExpandedInput(true);
        }

        setInput(value);
        debouncedSetInput(value);
    }, [setInput, debouncedSetInput, showExpandedInput]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    }, [handleSubmit]);

    // Cleanup debounce
    useEffect(() => {
        return () => {
            debouncedSetInput.cancel();
        };
    }, [debouncedSetInput]);

    return (
        <>
            {/* Modal Input Lớn */}
            {showExpandedInput && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl m-4 rounded-xl shadow-xl max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Soạn tin nhắn
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowExpandedInput(false)}
                                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                            >
                                <svg
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4">
                            <TextareaAutosize
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                className="w-full p-4 
                                    text-base
                                    bg-gray-50 dark:bg-gray-700 
                                    border border-gray-200 dark:border-gray-600
                                    rounded-xl 
                                    focus:outline-none focus:ring-2 focus:ring-blue-500
                                    text-gray-900 dark:text-white
                                    placeholder-gray-400 dark:placeholder-gray-500
                                    resize-none"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowExpandedInput(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        setShowExpandedInput(false);
                                        handleSubmit(e as any);
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600"
                                >
                                    Gửi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Form chính */}
            <form onSubmit={handleSubmit} className="relative space-y-4">
                {/* Khu vực xem trước - thêm max-height và overflow */}
                <div className="absolute bottom-full left-0 right-0 space-y-2 mb-2 max-h-[40vh] overflow-y-auto">
                    {/* Hiển thị ảnh */}
                    {imagePreviews.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl">
                            {imagePreviews.map((preview, index) => (
                                <div key={index} className="relative inline-block">
                                    <div
                                        className="relative w-40 h-40 sm:w-48 sm:h-48 overflow-hidden rounded-2xl
                        border-2 border-gray-200 dark:border-gray-700
                        bg-gray-50 dark:bg-gray-800
                        shadow-sm hover:shadow-md transition-all duration-200"
                                    >
                                        {imageLoadingStates[index] ? ( // Hiển thị loading
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                                                <svg
                                                    className="animate-spin h-10 w-10 text-gray-600 dark:text-gray-400"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    ></circle>
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    ></path>
                                                </svg>
                                            </div>
                                        ) : (
                                            <img
                                                src={preview}
                                                alt={`Preview ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
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
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Hiển thị file */}
                    {filePreviews.length > 0 && (
                        <div className="flex flex-wrap gap-2 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl">
                            {filePreviews.map((file, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2 px-3 py-2 
                        bg-gray-50 dark:bg-gray-700 
                        border border-gray-200 dark:border-gray-600 
                        rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-600
                        transition-all duration-200
                        max-w-[200px]"
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {fileLoadingStates[index] ? ( // Hiển thị loading
                                            <svg
                                                className="animate-spin h-5 w-5 text-gray-600 dark:text-gray-400"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                        ) : (
                                            <svg
                                                className="w-5 h-5 flex-shrink-0 text-gray-500 dark:text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                />
                                            </svg>
                                        )}
                                        <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                            {file.name}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveFile(index)}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-500 
                          rounded-full transition-colors duration-200
                          flex-shrink-0"
                                    >
                                        <svg
                                            className="w-4 h-4 text-gray-500 dark:text-gray-400"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-end space-y-2 sm:space-y-0 sm:space-x-2">
                        <div className="flex space-x-2 justify-start sm:justify-normal">
                            <button
                                type="button"
                                onClick={clearChat}
                                className="p-2.5 
                                    min-h-[42px] min-w-[42px]
                                    flex items-center justify-center
                                    bg-gray-100 hover:bg-gray-200 
                                    dark:bg-gray-700 dark:hover:bg-gray-600 
                                    text-gray-600 dark:text-gray-300
                                    rounded-xl border border-gray-200 dark:border-gray-600
                                    transition-all duration-200
                                    group relative"
                                title="Xóa toàn bộ đoạn chat"
                            >
                                <FontAwesomeIcon
                                    icon={faTrashCan}
                                    className="w-5 h-5 transform group-hover:scale-110 transition-transform"
                                />
                                <span
                                    className="absolute -top-10 left-1/2 -translate-x-1/2 
                                    px-2 py-1 rounded-lg text-xs font-medium
                                    bg-gray-800 dark:bg-gray-700 text-white
                                    opacity-0 group-hover:opacity-100
                                    transition-opacity duration-200
                                    whitespace-nowrap
                                    z-10"
                                >
                                    Xóa toàn bộ
                                </span>
                            </button>

                            <div className="relative group">
                                <button
                                    type="button"
                                    id="mode-button"
                                    onClick={() => setShowModeModal(!showModeModal)}
                                    className="p-2.5 
                                        min-h-[42px] min-w-[42px]
                                        flex items-center justify-center
                                        bg-gray-100 hover:bg-gray-200 
                                        dark:bg-gray-700 dark:hover:bg-gray-600 
                                        text-gray-600 dark:text-gray-300
                                        rounded-xl border border-gray-200 dark:border-gray-600
                                        transition-all duration-200
                                        group relative"
                                >
                                    <FontAwesomeIcon
                                        icon={faGear}
                                        className="w-5 h-5 transform group-hover:scale-110 transition-transform"
                                    />
                                    <span
                                        className="absolute -top-10 left-1/2 -translate-x-1/2 
                                        px-2 py-1 rounded-lg text-xs font-medium
                                        bg-gray-800 dark:bg-gray-700 text-white
                                        opacity-0 group-hover:opacity-100
                                        transition-opacity duration-200
                                        whitespace-nowrap
                                        z-10"
                                    >
                                        Chọn chế độ
                                    </span>
                                </button>

                                {showModeModal && (
                                    <div
                                        id="mode-modal"
                                        className="absolute bottom-full mb-2 left-0 w-[11em] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-50"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="inline-flex items-center cursor-not-allowed opacity-50">
                                                <input
                                                    type="checkbox"
                                                    checked={mode.search}
                                                    onChange={() => handleModeChange('search')}
                                                    className="sr-only peer"
                                                    disabled={true}
                                                />
                                                <div
                                                    className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"
                                                ></div>
                                                <span className="ml-3 text-base font-medium text-gray-900 dark:text-gray-300">
                                                    🔍 Tìm kiếm
                                                </span>
                                            </label>
                                        </div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={mode.speed}
                                                    onChange={() => handleModeChange('speed')}
                                                    className="sr-only peer"
                                                />
                                                <div
                                                    className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"
                                                ></div>
                                                <span className="ml-3 text-base font-medium text-gray-900 dark:text-gray-300">
                                                    ⚡ Tốc độ
                                                </span>
                                            </label>
                                        </div>
                                        <div className="flex items-center justify-between md:mb-2">
                                            <label className="inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={mode.image}
                                                    onChange={() => handleModeChange('image')}
                                                    className="sr-only peer"
                                                />
                                                <div
                                                    className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"
                                                ></div>
                                                <span className="ml-3 text-base font-medium text-gray-900 dark:text-gray-300">
                                                    🖼️ Tạo ảnh
                                                </span>
                                            </label>
                                        </div>
                                        <div className="flex items-center justify-between sm:flex hidden">
                                            <label className="inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={mode.experiment}
                                                    onChange={() => handleModeChange('experiment')}
                                                    className="sr-only peer"
                                                />
                                                <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
                                                <span className="ml-3 text-base font-medium text-gray-900 dark:text-gray-300">
                                                    🧪 Test
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input và button mới */}
                            <input
                                type="file"
                                key={fileInputKey}
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept="image/*,.pdf,.txt,.js,.py,.html,.css,.md,.csv,.xml,.rtf" // Chấp nhận cả ảnh và file
                                multiple
                                className="hidden"
                            />
                            {!mode.experiment ? ( // Thêm điều kiện để ẩn nút tải ảnh khi ở chế độ experiment
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={mode.speed} // Disable trong chế độ speed
                                    className={`p-2.5 
                                        min-h-[42px] min-w-[42px]
                                        flex items-center justify-center
                                        ${mode.speed
                                            ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-50'
                                            : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
                                        }
                                        text-gray-600 dark:text-gray-300
                                        rounded-xl border border-gray-200 dark:border-gray-600
                                        transition-all duration-200
                                        group relative`}
                                    title={mode.speed ? "Không thể tải lên trong chế độ này" : "Tải ảnh và tài liệu"}
                                >
                                    <FontAwesomeIcon
                                        icon={faFileImport}
                                        className={`w-5 h-5 transform ${!mode.speed && 'group-hover:scale-110'} transition-transform`}
                                    />
                                    <span
                                        className="absolute -top-10 left-1/2 -translate-x-1/2 
                                        px-2 py-1 rounded-lg text-xs font-medium
                                        bg-gray-800 dark:bg-gray-700 text-white
                                        opacity-0 group-hover:opacity-100
                                        transition-opacity duration-200
                                        whitespace-nowrap
                                        z-10"
                                    >
                                        {mode.speed ? "Không khả dụng trong chế độ này" : "Tải lên"}
                                    </span>
                                </button>
                            ) : (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowModelSelector(!showModelSelector)}
                                        className="p-2.5 
                                            min-h-[42px]
                                            flex items-center justify-center gap-2
                                            bg-white dark:bg-gray-800
                                            text-gray-600 dark:text-gray-300
                                            rounded-xl border border-gray-200 dark:border-gray-600
                                            transition-all duration-200
                                            group relative
                                            shadow-sm hover:shadow-md"
                                    >
                                        <span className="text-sm truncate max-w-[150px]">{selectedModel.split('/').pop()}</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {showModelSelector && (
                                        <div className="absolute bottom-full left-0 mb-2 w-[250px] bg-white dark:bg-gray-800 rounded-lg shadow-lg 
                                        border border-gray-200 dark:border-gray-700 
                                        p-3 z-50"
                                        >
                                            <div className="space-y-2">
                                                <div className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Tạo văn bản</div>
                                                {availableModels.filter(model => model.type === 'text').map((model) => (
                                                    <button
                                                        key={model.id}
                                                        onClick={() => {
                                                            setSelectedModel(model.id);
                                                            setShowModelSelector(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm
                                                            ${selectedModel === model.id
                                                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                                            }
                                                            transition-colors duration-200`}
                                                    >
                                                        {model.name}
                                                    </button>
                                                ))}

                                                <div className="my-2 border-t border-gray-200 dark:border-gray-700"></div>

                                                <div className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Tạo ảnh</div>
                                                {availableModels.filter(model => model.type === 'image').map((model) => (
                                                    <button
                                                        key={model.id}
                                                        onClick={() => {
                                                            setSelectedModel(model.id);
                                                            setShowModelSelector(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm
                                                            ${selectedModel === model.id
                                                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                                                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                                            }
                                                            transition-colors duration-200`}
                                                    >
                                                        {model.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-1 space-x-1 sm:space-x-2">
                            <TextareaAutosize
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Nhập tin nhắn..."
                                className="flex-1 px-2 sm:px-3 py-2.5 
                                    text-sm sm:text-base 
                                    bg-gray-50 dark:bg-gray-700 
                                    border border-gray-200 dark:border-gray-600
                                    rounded-xl 
                                    focus:outline-none focus:ring-2 focus:ring-blue-500
                                    text-gray-900 dark:text-white
                                    placeholder-gray-400 dark:placeholder-gray-500
                                    resize-none min-h-[42px]
                                    transition-all duration-200"
                                style={{
                                    transform: 'translateZ(0)',
                                    backfaceVisibility: 'hidden'
                                }}
                                disabled={isLoading}
                                minRows={1}
                                maxRows={1}
                            />

                            <button
                                type="button"
                                onClick={() => setShowExpandedInput(true)}
                                disabled={isLoading}
                                className={`p-2 sm:p-2.5 
                                    min-h-[42px] min-w-[36px] sm:min-w-[42px]
                                    flex items-center justify-center
                                    ${isLoading
                                        ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-50'
                                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
                                    }
                                    text-gray-600 dark:text-gray-300
                                    rounded-xl border border-gray-200 dark:border-gray-600
                                    transition-all duration-200`}
                                title={isLoading ? "Không thể mở soạn thảo khi đang tạo phản hồi" : "Mở soạn thảo"}
                            >
                                <svg
                                    className="w-4 h-4 sm:w-5 sm:h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 8h16M4 16h16"
                                    />
                                </svg>
                            </button>

                            <button
                                type="submit"
                                disabled={!stopGenerating && (isLoading || (!input.trim() && !selectedImages.length && !selectedFiles.length))}
                                className={`px-2 sm:px-4 py-2.5 
                                    min-h-[42px]
                                    text-sm sm:text-base 
                                    ${stopGenerating
                                        ? 'bg-red-500 hover:bg-red-600'
                                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
                                    }
                                    text-white font-medium rounded-xl
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    transform active:scale-[0.98] 
                                    transition-all duration-200
                                    whitespace-nowrap`}
                                onClick={stopGenerating ? (e) => {
                                    e.preventDefault();
                                    stopGenerating();
                                } : undefined}
                            >
                                {stopGenerating ? 'Dừng' : 'Gửi'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </>
    );
};

export default ChatInput;