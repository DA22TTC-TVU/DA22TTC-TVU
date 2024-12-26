// types.ts
interface Message {
    role: 'user' | 'assistant';
    content: string;
    imageUrls?: string[];
    files?: { name: string, type: string }[];
}

interface ChatHistory {
    role: 'user' | 'model';
    parts: { text: string }[];
}

interface ImagePart {
    inlineData: {
        data: string;
        mimeType: string;
    };
}

// Thêm constant cho các định dạng file được hỗ trợ
const SUPPORTED_FILE_TYPES = [
    'application/pdf',
    'application/x-javascript',
    'text/javascript',
    'application/x-python',
    'text/x-python',
    'text/plain',
    'text/html',
    'text/css',
    'text/md',
    'text/csv',
    'text/xml',
    'text/rtf'
];

// Thêm interface cho modal
interface CodePreviewModalType {
    isOpen: boolean;
    content: string;
    originalCode: string;
    isFullscreen: boolean;
    mode?: 'preview' | 'run' | 'result' | 'edit';
    language?: string;
}

export type { Message, ChatHistory, ImagePart, CodePreviewModalType };
export { SUPPORTED_FILE_TYPES };