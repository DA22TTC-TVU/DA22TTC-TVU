export interface DriveInfo {
    total: number;
    used: number;
    remaining: number;
}

export interface FileItem {
    id: string;
    name: string;
    mimeType: string;
    createdTime: string;
    size: number;
    isUploading?: boolean;
    uploadProgress?: number;
} 