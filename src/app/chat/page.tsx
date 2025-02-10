'use client'
import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Toaster, toast } from 'react-hot-toast';
import ChatHeader from './components/ChatHeader';
import ChatInput from './components/ChatInput';
import ChatMessages from './components/ChatMessages';
import CodePreviewModal from './components/CodePreviewModal';
import { useTheme } from 'next-themes';
import { ChatHistory, CodePreviewModalType, ImagePart, Message } from './types/chat';
import Groq from 'groq-sdk';
import Together from "together-ai";
import ChatSidebar from './components/ChatSidebar';

interface ChatInputProps {
    selectedModel: string;
    setSelectedModel: React.Dispatch<React.SetStateAction<string>>;
}

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
    const [stopGenerating, setStopGenerating] = useState<(() => void) | null>(null);
    const { theme } = useTheme();
    const [groqModel, setGroqModel] = useState<Groq | null>(null);
    const [togetherModel, setTogetherModel] = useState<Together | null>(null);
   
    useEffect(() => {
        const initGroq = async () => {
            if (mode.speed && !groqModel) {
                try {
                    const response = await fetch('/api/drive/ai-search');
                    const { groqApiKey } = await response.json();

                    if (!groqApiKey) {
                        throw new Error('Không tìm thấy GROQ API key');
                    }

                    const groq = new Groq({ apiKey: groqApiKey, dangerouslyAllowBrowser: true });
                    setGroqModel(groq);
                    setModel({ model: groq });
                } catch (error) {
                    console.error('Lỗi khởi tạo GROQ:', error);
                    toast.error('Không thể kết nối với GROQ');

                }
            }
        };
        initGroq();
    }, [mode.speed, groqModel]);

    useEffect(() => {
        const initGemini = async () => {
            if (!mode.speed) {
                try {
                    const response = await fetch('/api/drive/ai-search');
                    const { apiKey } = await response.json();
                    const genAI = new GoogleGenerativeAI(apiKey);

                    const generationConfig = {
                        temperature: 1,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: 8192,
                        responseMimeType: "text/plain",
                    };

                    const aiModel = genAI.getGenerativeModel({
                        model: "gemini-2.0-pro-exp-02-05",
                    });

                    const chat = aiModel.startChat({
                        generationConfig,
                        history: [],
                    });

                    setModel({ model: aiModel, chat, generationConfig });
                } catch (error) {
                    console.error('Lỗi khởi tạo Gemini:', error);
                    toast.error('Không thể kết nối với Gemini');
                }
            }
        };
        initGemini();
    }, [mode.speed]);

    useEffect(() => {
        const initTogether = async () => {
            if (mode.image && !togetherModel) {
                try {
                    const response = await fetch('/api/drive/ai-search');
                    const { togetherApiKey } = await response.json();

                    if (!togetherApiKey) {
                        throw new Error('Không tìm thấy Together API key');
                    }

                    const together = new Together({ apiKey: togetherApiKey });
                    setTogetherModel(together);
                } catch (error) {
                    console.error('Lỗi khởi tạo Together:', error);
                    toast.error('Không thể kết nối với Together AI');
                }
            }
        };
        initTogether();
    }, [mode.image, togetherModel]);

    const regenerateMessage = async (index: number) => {
        if (!model || isLoading) return;

        const userMessage = messages[index - 1];
        if (!userMessage || userMessage.role !== 'user') return;

        setMessages(prev => prev.filter((_, i) => i !== index));
        setIsLoading(true);
        setStreamingText('');

        try {
            if (mode.speed && groqModel) {
                const historyUpToIndex = chatHistory.slice(0, index - 1);
                const chatCompletion = await groqModel.chat.completions.create({
                    messages: [
                        ...historyUpToIndex.map(msg => ({
                            role: msg.role === 'model' ? 'assistant' : msg.role,
                            content: msg.parts[0].text
                        })),
                        {
                            role: 'user',
                            content: userMessage
                        }
                    ],
                    model: "llama-3.3-70b-versatile",
                    temperature: 1,
                    max_tokens: 1024,
                    top_p: 1,
                    stream: true
                } as any);

                let fullResponse = '';
                const controller = new AbortController();
                setStopGenerating(() => () => controller.abort());

                try {
                    for await (const chunk of chatCompletion as any) {
                        if (controller.signal.aborted) break;
                        const chunkText = chunk.choices[0]?.delta?.content || '';
                        fullResponse += chunkText;
                        setStreamingText(fullResponse);
                    }
                } catch (error: any) {
                    if (error.name === 'AbortError') {
                        console.log('Đã dừng sinh văn bản');
                    } else {
                        throw error;
                    }
                }

                setChatHistory(prev => [...prev, {
                    role: 'model',
                    parts: [{ text: fullResponse }]
                }]);

                setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }]);
                setStreamingText('');

            } else {
                const historyUpToIndex = chatHistory.slice(0, index - 1);

                const newChat = model.model.startChat({
                    generationConfig: model.generationConfig,
                    history: historyUpToIndex
                });

                setModel((prev: any) => ({ ...prev, chat: newChat }));

                let parts = [];
                if (userMessage.content) {
                    parts.push(userMessage.content);
                }

                const result = await newChat.sendMessageStream(parts);
                let fullResponse = '';

                const controller = new AbortController();
                setStopGenerating(() => () => controller.abort());

                try {
                    for await (const chunk of result.stream) {
                        if (controller.signal.aborted) break;
                        const chunkText = chunk.text();
                        fullResponse += chunkText;
                        setStreamingText(fullResponse);
                    }
                } catch (error: any) {
                    if (error.name === 'AbortError') {
                        console.log('Đã dừng sinh văn bản');
                    } else {
                        throw error;
                    }
                }

                setChatHistory(prev => [...prev, {
                    role: 'model',
                    parts: [{ text: fullResponse }]
                }]);

                setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }]);
                setStreamingText('');
            }
        } catch (error) {
            console.error('Lỗi khi tạo lại tin nhắn:', error);
            toast.error('Lỗi khi tạo lại tin nhắn');
        } finally {
            setIsLoading(false);
            setStopGenerating(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !selectedImages.length && !selectedFiles.length) || !model || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setIsLoading(true);
        setStreamingText('');

        try {
            if (mode.image && togetherModel) {
                let imageUrls: string[] = [];
                let files = [...filePreviews];

                if (selectedImages.length > 0 && imagePreviews.length > 0) {
                    imageUrls = [...imagePreviews];
                }

                setMessages(prev => [
                    ...prev,
                    {
                        role: 'user',
                        content: userMessage,
                        imageUrls: imageUrls,
                        files: files
                    },
                    {
                        role: 'assistant',
                        content: 'Đang tạo ảnh...',
                        generatedImages: [{ base64: '', isLoading: true }]
                    }
                ]);

                handleRemoveImage();
                setSelectedFiles([]);
                setFilePreviews([]);
                if (documentInputRef.current) {
                    documentInputRef.current.value = '';
                }

                const imagePromptResult = await model.chat.sendMessage([
                    "Convert this message to an English image generation prompt, only return the prompt without any explanation: " + userMessage
                ]);
                const englishPrompt = imagePromptResult.response.text();

                const imageResponse = await togetherModel.images.create({
                    model: "black-forest-labs/FLUX.1-schnell-Free",
                    prompt: englishPrompt,
                    width: 1024,
                    height: 768,
                    steps: 4,
                    n: 1,
                    response_format: "base64"
                });

                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                        role: 'assistant',
                        content: 'Đây là ảnh của bạn!',
                        generatedImages: [{
                            base64: imageResponse.data[0].b64_json ?? '',
                            isLoading: false
                        }]
                    };
                    return newMessages;
                });
            } else if (mode.speed && groqModel) {
                setChatHistory(prev => [...prev, {
                    role: 'user',
                    parts: [{ text: userMessage }]
                }]);

                setMessages(prev => [...prev, {
                    role: 'user',
                    content: userMessage
                }]);

                const chatCompletion = await groqModel.chat.completions.create({
                    messages: [
                        ...chatHistory.map(msg => ({
                            role: msg.role === 'model' ? 'assistant' : msg.role,
                            content: msg.parts[0].text
                        })),
                        {
                            role: 'user',
                            content: userMessage
                        }
                    ],
                    model: "llama-3.3-70b-versatile",
                    temperature: 1,
                    max_tokens: 1024,
                    top_p: 1,
                    stream: true
                } as any);

                let fullResponse = '';
                const controller = new AbortController();
                setStopGenerating(() => () => controller.abort());

                try {
                    for await (const chunk of chatCompletion as any) {
                        if (controller.signal.aborted) break;
                        const chunkText = chunk.choices[0]?.delta?.content || '';
                        fullResponse += chunkText;
                        setStreamingText(fullResponse);
                    }
                } catch (error: any) {
                    if (error.name === 'AbortError') {
                        console.log('Đã dừng sinh văn bản');
                    } else {
                        throw error;
                    }
                }

                setChatHistory(prev => [...prev, {
                    role: 'model',
                    parts: [{ text: fullResponse }]
                }]);

                setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }]);
                setStreamingText('');

            } else {
                const newChat = model.model.startChat({
                    generationConfig: model.generationConfig,
                    history: chatHistory
                });

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

                const result = await newChat.sendMessageStream(parts);
                let fullResponse = '';

                const controller = new AbortController();
                setStopGenerating(() => () => controller.abort());

                try {
                    for await (const chunk of result.stream) {
                        if (controller.signal.aborted) {
                            break;
                        }
                        const chunkText = chunk.text();
                        fullResponse += chunkText;
                        setStreamingText(fullResponse);
                    }
                } catch (error: any) {
                    if (error.name === 'AbortError') {
                        console.log('Đã dừng sinh văn bản');
                    } else {
                        throw error;
                    }
                }

                setChatHistory(prev => [...prev, {
                    role: 'model',
                    parts: [{ text: fullResponse }]
                }]);

                setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }]);
                setStreamingText('');

                setModel((prev: any) => ({ ...prev, chat: newChat }));
            }

        } catch (error) {
            console.error('Lỗi khi gửi tin nhắn:', error);
            toast.error('Lỗi khi gửi tin nhắn');
        } finally {
            setIsLoading(false);
            setStopGenerating(null);
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

    const deleteMessage = (index: number) => {
        // Xóa tin nhắn khỏi UI
        setMessages(prev => prev.filter((_, i) => i !== index));

        // Xóa tin nhắn khỏi history
        const historyIndex = Math.floor(index / 2); // Vì mỗi cặp user-assistant là 2 tin nhắn
        setChatHistory(prev => prev.filter((_, i) => i !== historyIndex));

        // Nếu xóa tin nhắn cuối cùng và đang loading, hủy loading
        if (index === messages.length - 1 && isLoading) {
            setIsLoading(false);
            setStreamingText('');
            if (stopGenerating) {
                stopGenerating();
            }
        }
    };

    const updateMessage = (index: number, newContent: string) => {
        // Cập nhật tin nhắn trong messages
        setMessages(prev => prev.map((msg, i) =>
            i === index ? { ...msg, content: newContent } : msg
        ));

        // Cập nhật tin nhắn trong history
        const historyIndex = Math.floor(index / 2); // Vì mỗi cặp user-assistant là 2 tin nhắn
        setChatHistory(prev => prev.map((msg, i) =>
            i === historyIndex ? {
                ...msg,
                parts: [{ text: newContent }]
            } : msg
        ));
    };

    const clearChat = () => {
        if (window.confirm('Bạn có chắc muốn xóa toàn bộ đoạn chat?')) {
            setMessages([]);
            setChatHistory([]);
            setStreamingText('');
            if (stopGenerating) {
                stopGenerating();
            }
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // md breakpoint của Tailwind
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleNewChat = () => {
        setMessages([]);
        setChatHistory([]);
        setStreamingText('');
        if (stopGenerating) {
            stopGenerating();
        }
        setIsLoading(false);
    };

    const handleSelectChat = (session: any) => {
        setMessages(session.messages);
        // Cập nhật chatHistory tương ứng nếu cần
        const newHistory = session.messages.reduce((acc: any[], msg: any) => {
            if (msg.role === 'user' || msg.role === 'assistant') {
                acc.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                });
            }
            return acc;
        }, []);
        setChatHistory(newHistory);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <div className="flex">
                <ChatSidebar
                    onNewChat={handleNewChat}
                    onSelectChat={handleSelectChat}
                    currentMessages={messages}
                    streamingText={streamingText}
                    isLoading={isLoading}
                />

                <div className="flex-1">
                    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
                        <ChatHeader />

                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-2 sm:p-4">
                            <ChatMessages
                                messages={messages}
                                isLoading={isLoading}
                                streamingText={streamingText}
                                setCodePreview={setCodePreview}
                                isMobile={isMobile}
                                setInput={setInput}
                                regenerateMessage={regenerateMessage}
                                deleteMessage={deleteMessage}
                                updateMessage={updateMessage}
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
                                stopGenerating={stopGenerating}
                                clearChat={clearChat}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <CodePreviewModal
                codePreview={codePreview}
                setCodePreview={setCodePreview}
                isMobile={isMobile}
            />

            <Toaster
                toastOptions={{
                    style: {
                        background: theme === 'dark' ? '#374151' : '#fff',
                        color: theme === 'dark' ? '#fff' : '#000',
                        border: theme === 'dark' ? '1px solid #4B5563' : '1px solid #E5E7EB',
                    },
                }}
            />
        </div>
    );
}