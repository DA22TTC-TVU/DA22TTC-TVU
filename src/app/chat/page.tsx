'use client'
import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Toaster, toast } from 'react-hot-toast';
import ChatHeader from './components/ChatHeader';
import ChatInput from './components/ChatInput';
import ChatMessages from './components/ChatMessages';
import CodePreviewModal from './components/CodePreviewModal';
import { ChatHistory, CodePreviewModalType, ImagePart, Message } from './types/chat';

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [model, setModel] = useState<any>(null);
    const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
    const [streamingText, setStreamingText] = useState('');
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [filePreviews, setFilePreviews] = useState<{ name: string, type: string }[]>([]);
    const documentInputRef = useRef<HTMLInputElement>(null);
    const [codePreview, setCodePreview] = useState<CodePreviewModalType>({
        isOpen: false,
        content: '',
        originalCode: '',
        isFullscreen: false,
        mode: 'preview',
        language: ''
    });
    const [isMobile, setIsMobile] = useState(false);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [mode, setMode] = useState({
        search: false,
        speed: false,
        image: false,
    });

    useEffect(() => {
        const initAI = async () => {
            try {
                const response = await fetch('/api/drive/ai-search');
                const { apiKey } = await response.json();
                const genAI = new GoogleGenerativeAI(apiKey);

                const aiModel = genAI.getGenerativeModel({
                    model: "gemini-2.0-flash-exp",
                });

                const generationConfig = {
                    temperature: 1,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 8192,
                    responseMimeType: "text/plain",
                };

                setModel(aiModel.startChat({
                    generationConfig,
                    history: chatHistory,
                }));
            } catch (error) {
                console.error('Lỗi khởi tạo AI:', error);
                toast.error('Không thể kết nối với AI');
            }
        };
        initAI();
    }, [chatHistory]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !selectedImages.length && !selectedFiles.length) || !model || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setIsLoading(true);
        setStreamingText('');

        try {
            let parts = [];
            let imageUrls: string[] = [];
            let files = [...filePreviews];

            if (selectedImages.length > 0 && imagePreviews.length > 0) {
                imageUrls = [...imagePreviews];
                for (const preview of imagePreviews) {
                    const imageData = preview.split(',')[1] || '';
                    const imagePart: ImagePart = {
                        inlineData: {
                            data: imageData,
                            mimeType: selectedImages[0].type,
                        }
                    };
                    parts.push(imagePart);
                }
            }

            if (userMessage) {
                parts.push(userMessage);
            }

            if (selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    const reader = new FileReader();
                    const fileData = await new Promise<string>((resolve) => {
                        reader.onloadend = () => {
                            const base64Data = reader.result as string;
                            resolve(base64Data.split(',')[1] || '');
                        };
                        reader.readAsDataURL(file);
                    });

                    parts.push({
                        inlineData: {
                            data: fileData,
                            mimeType: file.type
                        }
                    });
                }
            }

            setChatHistory(prev => [...prev, {
                role: 'user',
                parts: [{ text: userMessage }]
            }]);

            setMessages(prev => [...prev, {
                role: 'user',
                content: userMessage,
                imageUrls: imageUrls,
                files: files
            }]);

            handleRemoveImage();
            setSelectedFiles([]);
            setFilePreviews([]);
            if (documentInputRef.current) {
                documentInputRef.current.value = '';
            }

            const result = await model.sendMessageStream(parts);
            let fullResponse = '';

            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullResponse += chunkText;
                setStreamingText(fullResponse);
            }

            setChatHistory(prev => [...prev, {
                role: 'model',
                parts: [{ text: fullResponse }]
            }]);

            setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }]);
            setStreamingText('');

        } catch (error) {
            console.error('Lỗi khi gửi tin nhắn:', error);
            toast.error('Lỗi khi gửi tin nhắn');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveImage = (index?: number) => {
        if (typeof index === 'number') {
            setSelectedImages(prev => prev.filter((_, i) => i !== index));
            setImagePreviews(prev => prev.filter((_, i) => i !== index));
        } else {
            setSelectedImages([]);
            setImagePreviews([]);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
        setFileInputKey(prev => prev + 1);
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setFilePreviews(prev => prev.filter((_, i) => i !== index));
        if (documentInputRef.current) {
            documentInputRef.current.value = '';
        }
        setFileInputKey(prev => prev + 1);
    };

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // md breakpoint của Tailwind
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
                <ChatHeader />

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-2 sm:p-4">
                    <ChatMessages
                        messages={messages}
                        isLoading={isLoading}
                        streamingText={streamingText}
                        setCodePreview={setCodePreview}
                        isMobile={isMobile}
                        setInput={setInput}
                    />

                    <ChatInput
                        input={input}
                        setInput={setInput}
                        isLoading={isLoading}
                        handleSubmit={handleSubmit}
                        imagePreviews={imagePreviews}
                        filePreviews={filePreviews}
                        handleRemoveImage={handleRemoveImage}
                        handleRemoveFile={handleRemoveFile}
                        selectedImages={selectedImages}
                        setSelectedImages={setSelectedImages}
                        setImagePreviews={setImagePreviews}
                        selectedFiles={selectedFiles}
                        setSelectedFiles={setSelectedFiles}
                        setFilePreviews={setFilePreviews}
                        fileInputKey={fileInputKey}
                        mode={mode}
                        setMode={setMode}
                    />
                </div>
            </div>

            <CodePreviewModal
                codePreview={codePreview}
                setCodePreview={setCodePreview}
                isMobile={isMobile}
            />

            <Toaster />
        </div>
    );
}