// ChatInput.tsx
'use client'
import { useRef, FormEvent, ClipboardEvent, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faFileUpload } from '@fortawesome/free-solid-svg-icons';
import { SUPPORTED_FILE_TYPES } from '../types/chat';
import { toast } from 'react-hot-toast';

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
    setFilePreviews
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const documentInputRef = useRef<HTMLInputElement>(null);

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const validFiles = files.filter(file => file.size <= 5 * 1024 * 1024);

        if (validFiles.length < files.length) {
            toast.error('Một số ảnh vượt quá giới hạn 5MB');
        }

        setSelectedImages(prev => [...prev, ...validFiles]);

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        // Kiểm tra định dạng file
        const invalidFiles = files.filter(file => !SUPPORTED_FILE_TYPES.includes(file.type));
        if (invalidFiles.length > 0) {
            toast.error('Định dạng file không được hỗ trợ. Chỉ hỗ trợ PDF, TXT, DOC, DOCX, CSV, MD, HTML, CSS, JS, PY, XML, RTF');
            if (documentInputRef.current) {
                documentInputRef.current.value = '';
            }
            return;
        }

        const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024);

        if (validFiles.length < files.length) {
            toast.error('Một số tệp vượt quá giới hạn 10MB');
        }

        setSelectedFiles(prev => [...prev, ...validFiles]);

        const newFilePreviews = validFiles.map(file => ({
            name: file.name,
            type: file.type
        }));

        setFilePreviews(prev => [...prev, ...newFilePreviews]);
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
            {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative inline-block">
                            <div className="relative w-40 h-40 sm:w-48 sm:h-48 overflow-hidden rounded-2xl
                                            border-2 border-gray-200 dark:border-gray-700
                                            bg-gray-50 dark:bg-gray-800
                                            shadow-sm hover:shadow-md transition-all duration-200"
                            >
                                <img
                                    src={preview}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
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
                <div className="flex gap-2 sm:hidden">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        accept="image/*"
                        multiple
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 
                                        flex-1
                                        flex items-center justify-center gap-2
                                        bg-gray-100 hover:bg-gray-200 
                                        dark:bg-gray-700 dark:hover:bg-gray-600 
                                        text-gray-600 dark:text-gray-300
                                        rounded-xl border border-gray-200 dark:border-gray-600
                                        transition-all duration-200"
                    >
                        <FontAwesomeIcon icon={faImage} className="w-5 h-5" />
                        <span className="text-sm font-medium">Thêm ảnh</span>
                    </button>

                    <input
                        type="file"
                        ref={documentInputRef}
                        onChange={handleFileSelect}
                        accept=".pdf,.txt,.js,.py,.html,.css,.md,.csv,.xml,.rtf"
                        multiple
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => documentInputRef.current?.click()}
                        className="p-2.5 
                                        flex-1
                                        flex items-center justify-center gap-2
                                        bg-gray-100 hover:bg-gray-200 
                                        dark:bg-gray-700 dark:hover:bg-gray-600 
                                        text-gray-600 dark:text-gray-300
                                        rounded-xl border border-gray-200 dark:border-gray-600
                                        transition-all duration-200"
                    >
                        <FontAwesomeIcon icon={faFileUpload} className="w-5 h-5" />
                        <span className="text-sm font-medium">Thêm tệp</span>
                    </button>
                </div>

                <div className="flex items-end space-x-2">
                    <div className="hidden sm:flex space-x-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageSelect}
                            accept="image/*"
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
                            title="Tải ảnh lên"
                        >
                            <FontAwesomeIcon
                                icon={faImage}
                                className="w-5 h-5 transform group-hover:scale-110 transition-transform"
                            />
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 
                                            px-2 py-1 rounded-lg text-xs font-medium
                                            bg-gray-800 dark:bg-gray-700 text-white
                                            opacity-0 group-hover:opacity-100
                                            transition-opacity duration-200
                                            whitespace-nowrap
                                            z-10"
                            >
                                Tải ảnh lên
                            </span>
                        </button>

                        <input
                            type="file"
                            ref={documentInputRef}
                            onChange={handleFileSelect}
                            accept=".pdf,.txt,.js,.py,.html,.css,.md,.csv,.xml,.rtf"
                            multiple
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => documentInputRef.current?.click()}
                            className="p-2.5 
                                            min-h-[42px] min-w-[42px]
                                            flex items-center justify-center
                                            bg-gray-100 hover:bg-gray-200 
                                            dark:bg-gray-700 dark:hover:bg-gray-600 
                                            text-gray-600 dark:text-gray-300
                                            rounded-xl border border-gray-200 dark:border-gray-600
                                            transition-all duration-200
                                            group relative"
                            title="Tải tài liệu"
                        >
                            <FontAwesomeIcon
                                icon={faFileUpload}
                                className="w-5 h-5 transform group-hover:scale-110 transition-transform"
                            />
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 
                                            px-2 py-1 rounded-lg text-xs font-medium
                                            bg-gray-800 dark:bg-gray-700 text-white
                                            opacity-0 group-hover:opacity-100
                                            transition-opacity duration-200
                                            whitespace-nowrap
                                            z-10"
                            >
                                Tải tài liệu
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