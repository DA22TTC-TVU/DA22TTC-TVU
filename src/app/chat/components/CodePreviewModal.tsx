// CodePreviewModal.tsx
'use client'
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCompress, faExpand, faTimes, faCode, faSpinner, faPlay } from '@fortawesome/free-solid-svg-icons';
import dynamic from 'next/dynamic';
import { CodePreviewModalType } from '../types/chat';
import { toast } from 'react-hot-toast';
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface CodePreviewModalProps {
    codePreview: CodePreviewModalType;
    setCodePreview: React.Dispatch<React.SetStateAction<CodePreviewModalType>>;
    isMobile: boolean;
}

const CodePreviewModal: React.FC<CodePreviewModalProps> = ({
    codePreview,
    setCodePreview,
    isMobile
}) => {
    const [isExecuting, setIsExecuting] = useState(false);

    const closeCodePreview = () => {
        setCodePreview({
            isOpen: false,
            content: '',
            originalCode: '',
            isFullscreen: false,
            mode: 'preview',
            language: ''
        });
    };

    const toggleFullscreen = () => {
        setCodePreview(prev => ({
            ...prev,
            isFullscreen: !prev.isFullscreen
        }));
    };

    const handleRunCode = async (code: string, language: string) => {
        try {
            setIsExecuting(true);
            setCodePreview(prev => ({
                ...prev,
                mode: 'result',
                content: '',
            }));

            const response = await fetch('/api/e2b/run', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code,
                    language
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Lỗi khi chạy code');
            }

            setCodePreview(prev => ({
                ...prev,
                content: data.output,
                mode: 'result'
            }));

        } catch (error) {
            console.error('Lỗi khi chạy code:', error);
            toast.error('Có lỗi xảy ra khi chạy code');
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <>
            {codePreview.isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
                        </div>

                        <div className={`inline-block align-bottom bg-white dark:bg-gray-800 
                            text-left overflow-hidden shadow-xl transform transition-all 
                            ${codePreview.isFullscreen || isMobile
                                ? 'fixed inset-0 w-full h-full rounded-none'
                                : 'sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full rounded-lg'}`}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center px-4 py-3 
                                border-b border-gray-200 dark:border-gray-700
                                sticky top-0 bg-white dark:bg-gray-800 z-10"
                            >
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                    {codePreview.language === 'html' ? 'Xem HTML' : 'Chạy code'}
                                </h3>
                                <div className="flex items-center gap-2">
                                    {!isMobile && (
                                        <button
                                            onClick={toggleFullscreen}
                                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 
                                                rounded-lg transition-colors"
                                            title={codePreview.isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
                                        >
                                            <FontAwesomeIcon
                                                icon={codePreview.isFullscreen ? faCompress : faExpand}
                                                className="w-4 h-4 text-gray-500 dark:text-gray-400"
                                            />
                                        </button>
                                    )}
                                    <button
                                        onClick={closeCodePreview}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 
                                            rounded-lg transition-colors"
                                        title="Đóng"
                                    >
                                        <FontAwesomeIcon
                                            icon={faTimes}
                                            className="w-4 h-4 text-gray-500 dark:text-gray-400"
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className={`${codePreview.isFullscreen || isMobile
                                ? 'h-[calc(100vh-56px)]'
                                : 'h-[80vh]'} overflow-auto`}
                            >
                                {codePreview.mode === 'preview' ? (
                                    <iframe
                                        srcDoc={codePreview.content}
                                        className="w-full h-full"
                                        title="HTML Preview"
                                        sandbox="allow-scripts"
                                    />
                                ) : codePreview.mode === 'result' ? (
                                    <div className="p-4 h-full">
                                        {codePreview.language === 'html' ? (
                                            <>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                                        Kết quả HTML:
                                                    </h3>
                                                    <button
                                                        onClick={() => setCodePreview(prev => ({
                                                            ...prev,
                                                            mode: 'edit',
                                                            content: prev.originalCode
                                                        }))}
                                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 
                                                            text-white rounded-lg transition-colors text-sm
                                                            flex items-center gap-2"
                                                    >
                                                        <FontAwesomeIcon icon={faCode} className="w-4 h-4" />
                                                        <span>Chỉnh sửa HTML</span>
                                                    </button>
                                                </div>
                                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg h-[calc(100%-3rem)] overflow-auto">
                                                    <iframe
                                                        srcDoc={codePreview.originalCode}
                                                        className="w-full h-full"
                                                        title="HTML Preview"
                                                        sandbox="allow-scripts"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {isExecuting ? (
                                                    <div className="flex flex-col items-center justify-center space-y-4 text-gray-400">
                                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400"></div>
                                                        <p>Đang thực thi lệnh...</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                                                                Kết quả thực thi:
                                                            </h3>
                                                            <button
                                                                onClick={() => setCodePreview(prev => ({
                                                                    ...prev,
                                                                    mode: 'edit',
                                                                    content: prev.originalCode
                                                                }))}
                                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 
                                                                    text-white rounded-lg transition-colors text-sm
                                                                    flex items-center gap-2"
                                                            >
                                                                <FontAwesomeIcon icon={faCode} className="w-4 h-4" />
                                                                <span>Chỉnh sửa code</span>
                                                            </button>
                                                        </div>
                                                        <pre className="whitespace-pre-wrap bg-gray-900 p-4 rounded-lg text-green-400 overflow-auto max-h-[calc(100vh-200px)]">
                                                            {codePreview.content}
                                                        </pre>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ) : codePreview.mode === 'edit' ? (
                                    <div className="h-full relative">
                                        <MonacoEditor
                                            height="100%"
                                            defaultLanguage={codePreview.language || 'javascript'}
                                            defaultValue={codePreview.content}
                                            theme="vs-dark"
                                            onChange={(value) => {
                                                if (value) setCodePreview(prev => ({
                                                    ...prev,
                                                    content: value,
                                                    originalCode: value
                                                }));
                                            }}
                                            options={{
                                                minimap: { enabled: false },
                                                fontSize: 14,
                                                lineNumbers: 'on',
                                                roundedSelection: false,
                                                scrollBeyondLastLine: false,
                                                automaticLayout: true
                                            }}
                                        />
                                        <div className="absolute bottom-4 right-4">
                                            <button
                                                onClick={() => {
                                                    if (codePreview.language === 'html') {
                                                        setCodePreview(prev => ({
                                                            ...prev,
                                                            mode: 'result',
                                                            content: prev.content
                                                        }));
                                                    } else {
                                                        handleRunCode(codePreview.content, codePreview.language || '');
                                                    }
                                                }}
                                                className="px-4 py-2 bg-green-600 hover:bg-green-700 
                                                    text-white rounded-lg transition-colors text-sm
                                                    flex items-center gap-2"
                                                disabled={isExecuting}
                                            >
                                                {isExecuting ? (
                                                    <>
                                                        <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
                                                        <span>Đang chạy...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <FontAwesomeIcon icon={codePreview.language === 'html' ? faCode : faPlay} className="w-4 h-4" />
                                                        <span>{codePreview.language === 'html' ? 'Xem kết quả' : 'Chạy code'}</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4">
                                        <pre className="whitespace-pre-wrap">{codePreview.content}</pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CodePreviewModal;