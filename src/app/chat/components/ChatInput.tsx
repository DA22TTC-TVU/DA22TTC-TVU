// ChatInput.tsx
'use client'
import { useRef, FormEvent, ClipboardEvent, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileImport } from '@fortawesome/free-solid-svg-icons';
import { SUPPORTED_FILE_TYPES } from '../types/chat';
import { toast } from 'react-hot-toast';
import { useState } from 'react';

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
    fileInputKey
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageLoadingStates, setImageLoadingStates] = useState<boolean[]>([]);
    const [fileLoadingStates, setFileLoadingStates] = useState<boolean[]>([]);

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

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Hiển thị ảnh */}
            {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2">
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
                <div className="flex flex-wrap gap-2 mb-4">
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

            <div className="flex flex-col space-y-2">
                <div className="flex items-end space-x-2">
                    <div className="flex space-x-2">
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
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2.5 
                         min-h-[42px] min-w-[42px]
                         flex items-center justify-center
                         bg-gray-100 hover:bg-gray-200 
                         dark:bg-gray-700 dark:hover:bg-gray-600 
                         text-gray-600 dark:text-gray-300
                         rounded-xl border border-gray-200 dark:border-gray-600
                         transition-all duration-200
                         group relative"
                            title="Tải ảnh và tài liệu"
                        >
                            <FontAwesomeIcon
                                icon={faFileImport} // Icon mới
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
                                Tải lên
                            </span>
                        </button>
                    </div>

                    <TextareaAutosize
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                        placeholder="Nhập tin nhắn..."
                        className="flex-1 px-3 py-2.5 
                                        text-sm sm:text-base 
                                        bg-gray-50 dark:bg-gray-700 
                                        border border-gray-200 dark:border-gray-600
                                        rounded-xl 
                                        focus:outline-none focus:ring-2 focus:ring-blue-500
                                        text-gray-900 dark:text-white
                                        placeholder-gray-400 dark:placeholder-gray-500
                                        resize-none min-h-[42px]
                                        transition-all duration-200"
                        disabled={isLoading}
                        minRows={1}
                        maxRows={5}
                    />

                    <button
                        type="submit"
                        disabled={isLoading || (!input.trim() && !selectedImages.length && !selectedFiles.length)}
                        className="px-4 py-2.5 
                                        min-h-[42px]
                                        text-sm sm:text-base 
                                        bg-gradient-to-r from-blue-500 to-indigo-500 
                                        text-white font-medium rounded-xl
                                        hover:from-blue-600 hover:to-indigo-600 
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                        transform active:scale-[0.98] 
                                        transition-all duration-200"
                    >
                        Gửi
                    </button>
                </div>
            </div>
        </form>
    );
};

export default ChatInput;