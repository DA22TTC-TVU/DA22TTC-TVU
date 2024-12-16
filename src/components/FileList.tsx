'use client'
import React, { useState, useRef, useEffect } from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { FileItem } from '../types';
import JSZip from 'jszip';

interface FileListProps {
    files: FileItem[];
    isLoading: boolean;
    currentFolderId: string | null;
    currentFolderName?: string;
    folderPath?: { id: string; name: string }[];
    onFolderClick: (folderId: string) => void;
    onBreadcrumbClick: (folderId: string, index: number) => void;
    onBackClick: () => void;
    onDownload: (fileId: string, fileName: string) => void;
    onUploadFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onUploadFolder: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onCheckFolderContent: (folderId: string) => Promise<boolean>;
}

function formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getFileNameWithoutExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex === -1 ? fileName : fileName.substring(0, lastDotIndex);
}

function getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex === -1 ? '' : fileName.substring(lastDotIndex + 1);
}

export default function FileList({
    files,
    isLoading,
    currentFolderId,
    currentFolderName,
    folderPath = [],
    onFolderClick,
    onBreadcrumbClick,
    onBackClick,
    onDownload,
    onUploadFile,
    onUploadFolder,
    onCheckFolderContent
}: FileListProps) {
    // Tách thư mục và file
    const folders = files.filter(file => file.mimeType === 'application/vnd.google-apps.folder');
    const regularFiles = files.filter(file => file.mimeType !== 'application/vnd.google-apps.folder');

    // Sắp xếp thư mục và file theo ngày tạo mới nhất
    folders.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
    regularFiles.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());

    // Kết hợp thư mục và file
    const sortedFiles = [...folders, ...regularFiles];

    // State để lưu trữ chế độ hiển thị
    const [isGridView, setIsGridView] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);

    // Thêm state để theo dõi tiến trình nén
    const [compressingFolder, setCompressingFolder] = useState<string | null>(null);
    const [compressionProgress, setCompressionProgress] = useState(0);

    const [hasFolders, setHasFolders] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        const checkFolders = async () => {
            const results: { [key: string]: boolean } = {};
            for (const file of files) {
                if (file.mimeType === 'application/vnd.google-apps.folder') {
                    results[file.id] = await onCheckFolderContent(file.id);
                }
            }
            setHasFolders(results);
        };
        checkFolders();
    }, [files]);

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        dragCounter.current++;
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        dragCounter.current = 0;
        setIsDragging(false);

        const items = e.dataTransfer.items;
        if (!items) return;

        const entries = Array.from(items).map(item =>
            item.webkitGetAsEntry()
        ).filter((entry): entry is FileSystemEntry => entry !== null);

        const files: File[] = [];
        let hasFolder = false;
        let rootFolderName = '';

        for (const entry of entries) {
            if (entry.isDirectory) {
                hasFolder = true;
                rootFolderName = entry.name;
                const directoryReader = (entry as FileSystemDirectoryEntry).createReader();

                const readEntries = (): Promise<FileSystemEntry[]> => {
                    return new Promise((resolve, reject) => {
                        directoryReader.readEntries(resolve, reject);
                    });
                };

                const processEntry = async (entry: FileSystemEntry, path: string = '') => {
                    if (entry.isFile) {
                        const fileEntry = entry as FileSystemFileEntry;
                        return new Promise<void>((resolve, reject) => {
                            fileEntry.file((file: File) => {
                                const relativePath = path ? `${path}/${file.name}` : file.name;
                                const newFile = new File(
                                    [file],
                                    file.name,
                                    { type: file.type }
                                );
                                Object.defineProperty(newFile, 'webkitRelativePath', {
                                    value: relativePath
                                });
                                files.push(newFile);
                                resolve();
                            }, reject);
                        });
                    } else if (entry.isDirectory) {
                        const dirEntry = entry as FileSystemDirectoryEntry;
                        const reader = dirEntry.createReader();

                        // Đọc tất cả entries trong thư mục hiện tại
                        const readAllEntries = async (): Promise<FileSystemEntry[]> => {
                            const entries: FileSystemEntry[] = [];

                            const readNextBatch = async (): Promise<void> => {
                                const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
                                    reader.readEntries(resolve, reject);
                                });

                                if (batch.length > 0) {
                                    entries.push(...batch);
                                    await readNextBatch();
                                }
                            };

                            await readNextBatch();
                            return entries;
                        };

                        // Đọc tất cả entries
                        const entries = await readAllEntries();
                        const newPath = path ? `${path}/${entry.name}` : entry.name;

                        // Xử lý đệ quy cho mỗi entry
                        for (const childEntry of entries) {
                            await processEntry(childEntry, newPath);
                        }
                    }
                };

                await processEntry(entry);
            }
        }

        if (hasFolder && files.length > 0) {
            const filesArray = Object.assign(files, {
                item: (i: number) => files[i],
                rootFolderName
            });

            const event = {
                target: {
                    files: filesArray
                }
            } as unknown as React.ChangeEvent<HTMLInputElement>;
            onUploadFolder(event);
        } else {
            const event = {
                target: {
                    files: e.dataTransfer.files
                }
            } as React.ChangeEvent<HTMLInputElement>;
            onUploadFile(event);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    // Hàm tải về thư mục dưới dạng zip
    const handleDownloadFolder = async (folderId: string, folderName: string) => {
        try {
            setCompressingFolder(folderId);
            setCompressionProgress(0);

            // Lấy danh sách files
            const response = await fetch(`/api/drive/download-folder?folderId=${folderId}`);
            const data = await response.json();

            if (!data.files || !data.files.length) {
                throw new Error('No files found');
            }

            const zip = new JSZip();
            let downloadedFiles = 0;

            // Tải từng file qua API proxy
            for (const file of data.files) {
                if (file.mimeType !== 'application/vnd.google-apps.folder') {
                    try {
                        const fileResponse = await fetch(`/api/drive/download-folder?fileId=${file.id}`);
                        if (!fileResponse.ok) continue;

                        const blob = await fileResponse.blob();
                        zip.file(file.name, blob);

                        downloadedFiles++;
                        const progress = Math.round((downloadedFiles / data.files.length) * 100);
                        setCompressionProgress(progress);
                    } catch (error) {
                        console.error(`Lỗi khi tải file ${file.name}:`, error);
                        continue;
                    }
                }
            }

            const zipBlob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${folderName}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Lỗi khi tải thư mục:', error);
            alert('Có lỗi xảy ra khi tải thư mục');
        } finally {
            setCompressingFolder(null);
            setCompressionProgress(0);
        }
    };

    return (
        <div
            className="flex-1 p-3 md:p-6 flex flex-col h-[calc(100vh-88px)] relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Hiển thị overlay khi đang kéo file */}
            {isDragging && (
                <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3 3V8" />
                        </svg>
                        <p className="mt-2 text-sm text-blue-500">Thả file để tải lên</p>
                    </div>
                </div>
            )}

            <div className="flex flex-col mb-4">
                {currentFolderId && (
                    <>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                            <span
                                className="hover:text-blue-600 cursor-pointer"
                                onClick={() => onBackClick()}
                            >
                                DA22TTC
                            </span>
                            {folderPath.map((folder, index) => (
                                <React.Fragment key={folder.id}>
                                    <span className="text-gray-400">/</span>
                                    <span
                                        className="hover:text-blue-600 cursor-pointer"
                                        onClick={() => onBreadcrumbClick(folder.id, index)}
                                    >
                                        {folder.name}
                                    </span>
                                </React.Fragment>
                            ))}
                            {currentFolderName && (
                                <>
                                    <span className="text-gray-400">/</span>
                                    <span className="text-gray-800">{currentFolderName}</span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <button
                                onClick={onBackClick}
                                className="inline-flex items-center px-2 md:px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-full p-2 w-fit"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                <span className="hidden md:inline">Quay lại</span>
                            </button>
                            {!isLoading && (
                                <button
                                    onClick={() => setIsGridView(!isGridView)}
                                    className="hidden md:inline-flex items-center px-2 md:px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-full p-2 w-fit"
                                >
                                    {isGridView ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
                                        </svg>
                                    )}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>

            <div className={`grid ${isGridView ? 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : ''} grid-cols-1 gap-2 overflow-y-auto`}>
                {isLoading ? (
                    [...Array(5)].map((_, index) => (
                        <div key={index} className="flex items-center px-4 py-2 rounded-lg">
                            <div className="flex items-center flex-1">
                                <Skeleton circle width={24} height={24} className="mr-3" />
                                <Skeleton width={200} height={20} />
                            </div>
                        </div>
                    ))
                ) : sortedFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg">Thư mục trống</p>
                        <p className="text-sm mt-2">Chưa có tệp tin hoặc thư mục nào</p>
                    </div>
                ) : (
                    sortedFiles.map(file => (
                        <div
                            key={file.id}
                            className={`flex items-center px-4 py-2 hover:bg-gray-100 rounded-lg cursor-pointer group ${isGridView ? 'flex-row' : ''
                                } ${file.isUploading ? 'opacity-80 pointer-events-none' : ''}`}
                            onClick={() => file.mimeType === 'application/vnd.google-apps.folder' ? onFolderClick(file.id) : null}
                        >
                            <div className={`flex items-center ${isGridView ? 'flex-1 min-w-0' : 'flex-1 min-w-0'}`}>
                                {file.mimeType === 'application/vnd.google-apps.folder' ? (
                                    <div className="flex items-center w-full">
                                        <svg className="w-6 h-6 text-gray-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 1.99 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                                        </svg>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-gray-700 truncate">
                                                {file.name}
                                            </div>
                                            <div className="flex items-center text-xs text-gray-500 space-x-4">
                                                <span>{new Date(file.createdTime).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                        </div>
                                        {!file.isUploading && (
                                            hasFolders[file.id] ? null : (
                                                <>
                                                    {compressingFolder === file.id ? (
                                                        <div className="flex items-center">
                                                            <div className="ml-4 w-32">
                                                                <div className="w-full h-3 bg-gray-100 rounded-full border border-gray-200 my-2">
                                                                    <div
                                                                        className="h-full bg-blue-500 rounded-full"
                                                                        style={{
                                                                            width: `${compressionProgress}%`,
                                                                            transition: 'width 0.3s ease'
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="text-xs font-medium text-gray-600 text-right">
                                                                    {compressionProgress}%
                                                                </div>
                                                            </div>
                                                            <div className="ml-3 mr-2 flex items-center text-gray-500">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownloadFolder(file.id, file.name);
                                                            }}
                                                            className="md:opacity-0 md:group-hover:opacity-100 p-2 hover:bg-gray-200 rounded-full"
                                                        >
                                                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </>
                                            )
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center flex-1">
                                        <svg className="w-6 h-6 text-gray-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                        </svg>
                                        <div className="flex flex-col min-w-0">
                                            <div className="text-gray-700 flex min-w-0">
                                                <span className="truncate">{getFileNameWithoutExtension(file.name)}</span>
                                                <span className="flex-shrink-0">.{getFileExtension(file.name)}</span>
                                            </div>
                                            <div className="flex items-center text-xs text-gray-500 space-x-4">
                                                <span>{new Date(file.createdTime).toLocaleDateString('vi-VN')}</span>
                                                <span>{formatFileSize(file.size)}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDownload(file.id, file.name);
                                            }}
                                            className="md:opacity-0 md:group-hover:opacity-100 p-2 hover:bg-gray-200 rounded-full ml-auto"
                                        >
                                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {file.isUploading && (
                                <div className="ml-4 w-32">
                                    <div className="w-full h-3 bg-gray-100 rounded-full border border-gray-200 my-2">
                                        <div
                                            className="h-full bg-blue-500 rounded-full"
                                            style={{
                                                width: `${file.uploadProgress || 0}%`,
                                                transition: 'width 0.3s ease'
                                            }}
                                        />
                                    </div>
                                    <div className="text-xs font-medium text-gray-600 text-right">
                                        {file.uploadProgress}%
                                    </div>
                                </div>
                            )}

                            {file.isUploading && (
                                <div className="ml-3 mr-2 flex items-center text-gray-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
} 