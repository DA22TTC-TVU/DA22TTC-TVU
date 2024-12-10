'use client'
import React, { useState } from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { FileItem } from '../types';

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
    onDownload
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

    return (
        <div className="flex-1 p-3 md:p-6 flex flex-col h-[calc(100vh-88px)]">
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
                                    <svg className="w-6 h-6 text-gray-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 1.99 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6 text-gray-500 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                    </svg>
                                )}
                                <div className={`flex flex-col min-w-0 ${isGridView ? 'w-full' : ''}`}>
                                    {file.mimeType === 'application/vnd.google-apps.folder' ? (
                                        <span className="text-gray-700 truncate">{file.name}</span>
                                    ) : (
                                        <div className={`text-gray-700 flex min-w-0 ${isGridView ? 'w-full' : ''}`}>
                                            <span className="truncate">{getFileNameWithoutExtension(file.name)}</span>
                                            <span className="flex-shrink-0">.{getFileExtension(file.name)}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center text-xs text-gray-500 space-x-4">
                                        <span>{new Date(file.createdTime).toLocaleDateString('vi-VN')}</span>
                                        {file.mimeType !== 'application/vnd.google-apps.folder' && (
                                            <span className={`${isGridView ? 'block' : 'inline'}`}>{formatFileSize(file.size)}</span>
                                        )}
                                    </div>
                                </div>
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

                            {file.mimeType !== 'application/vnd.google-apps.folder' && !file.isUploading && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDownload(file.id, file.name);
                                    }}
                                    className={`md:opacity-0 md:group-hover:opacity-100 p-2 hover:bg-gray-200 rounded-full ml-auto`}
                                >
                                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
} 