'use client'
import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { FileItem } from '../types';

interface FileListProps {
    files: FileItem[];
    isLoading: boolean;
    currentFolderId: string | null;
    onFolderClick: (folderId: string) => void;
    onBackClick: () => void;
    onDownload: (fileId: string, fileName: string) => void;
}

export default function FileList({
    files,
    isLoading,
    currentFolderId,
    onFolderClick,
    onBackClick,
    onDownload
}: FileListProps) {
    return (
        <div className="flex-1 p-3 md:p-6 flex flex-col h-[calc(100vh-88px)]">
            <div className="flex items-center justify-between mb-4">
                {currentFolderId && (
                    <button
                        onClick={onBackClick}
                        className="inline-flex items-center px-2 md:px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-full p-2 w-fit"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="hidden md:inline">Quay lại</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-2 overflow-y-auto">
                {isLoading ? (
                    [...Array(5)].map((_, index) => (
                        <div key={index} className="flex items-center px-4 py-2 rounded-lg">
                            <div className="flex items-center flex-1">
                                <Skeleton circle width={24} height={24} className="mr-3" />
                                <Skeleton width={200} height={20} />
                            </div>
                        </div>
                    ))
                ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg">Thư mục trống</p>
                        <p className="text-sm mt-2">Chưa có tệp tin hoặc thư mục nào</p>
                    </div>
                ) : (
                    files.map(file => (
                        <div
                            key={file.id}
                            className="flex items-center px-4 py-2 hover:bg-gray-100 rounded-lg cursor-pointer group"
                            onClick={() => file.mimeType === 'application/vnd.google-apps.folder' ? onFolderClick(file.id) : null}
                        >
                            <div className="flex items-center flex-1">
                                {file.mimeType === 'application/vnd.google-apps.folder' ? (
                                    <svg className="w-6 h-6 text-gray-500 mr-3" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6 text-gray-500 mr-3" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                    </svg>
                                )}
                                <span className="text-gray-700">{file.name}</span>
                            </div>

                            {file.mimeType !== 'application/vnd.google-apps.folder' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDownload(file.id, file.name);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-200 rounded-full"
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