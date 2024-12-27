'use client'
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { FileItem } from '../types';
import JSZip from 'jszip';
import { useTheme } from 'next-themes';
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { toast } from 'react-hot-toast';
import { isPreviewableFile } from '../utils/fileHelpers';

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

// Thêm enum cho các tiêu chí sắp xếp
enum SortCriteria {
    Default = 'default',
    Name = 'name',
    Size = 'size',
    Date = 'date'
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
    const { theme } = useTheme();

    // Tách thư mục và file
    const folders = files.filter(file => file.mimeType === 'application/vnd.google-apps.folder');
    const regularFiles = files.filter(file => file.mimeType !== 'application/vnd.google-apps.folder');

    // Thêm state cho tiêu chí sắp xếp
    const [sortCriteria, setSortCriteria] = useState<SortCriteria>(SortCriteria.Default);

    // Thêm state cho bộ lọc đuôi file
    const [selectedExtension, setSelectedExtension] = useState<string | null>(null);

    // Lấy danh sách đuôi file duy nhất
    const uniqueExtensions = useMemo(() => {
        const extensions = regularFiles
            .map(file => getFileExtension(file.name).toLowerCase())
            .filter(ext => ext !== '');
        return Array.from(new Set(extensions)).sort();
    }, [regularFiles]);

    // Thêm state để theo dõi việc hiển thị thư mục
    const [showFolders, setShowFolders] = useState(true);

    // Hàm sắp xếp files dựa trên tiêu chí
    const getSortedFiles = (files: FileItem[]) => {
        let folders = files.filter(file => file.mimeType === 'application/vnd.google-apps.folder');
        let regularFiles = files.filter(file => file.mimeType !== 'application/vnd.google-apps.folder');

        // Lọc theo đuôi file nếu có
        if (selectedExtension) {
            regularFiles = regularFiles.filter(file =>
                getFileExtension(file.name).toLowerCase() === selectedExtension
            );
        }

        switch (sortCriteria) {
            case SortCriteria.Name:
                folders.sort((a, b) => a.name.localeCompare(b.name));
                regularFiles.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case SortCriteria.Size:
                folders.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
                regularFiles.sort((a, b) => (b.size || 0) - (a.size || 0));
                break;
            case SortCriteria.Date:
                folders.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
                regularFiles.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
                break;
            default:
                folders.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
                regularFiles.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
        }

        // Trả về danh sách files dựa vào trạng thái hiển thị thư mục
        return showFolders ? [...folders, ...regularFiles] : regularFiles;
    };

    // Thay thế dòng const sortedFiles = [...folders, ...regularFiles]; bằng:
    const sortedFiles = getSortedFiles(files);

    // State để lưu trữ chế độ hiển thị
    const [isGridView, setIsGridView] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);

    // Thêm state để theo dõi tiến trình nén
    const [compressingFolder, setCompressingFolder] = useState<string | null>(null);
    const [compressionProgress, setCompressionProgress] = useState(0);

    const [hasFolders, setHasFolders] = useState<{ [key: string]: boolean }>({});

    // Thêm state để quản lý modal xem trước
    const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
    const [previewContent, setPreviewContent] = useState<string>('');
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

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

    // Thêm hàm để tạo link tải file
    const generateDownloadLink = (fileId: string) => {
        return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0`;
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

    // Thêm hàm để lấy nội dung file
    const fetchFileContent = async (fileId: string) => {
        try {
            setIsPreviewLoading(true);
            const response = await fetch(`/api/drive/preview?fileId=${fileId}`);
            const data = await response.text();
            setPreviewContent(data);
        } catch (error) {
            console.error('Lỗi khi tải nội dung file:', error);
            toast.error('Không thể tải nội dung file');
        } finally {
            setIsPreviewLoading(false);
        }
    };

    // Thêm hàm xử lý click để mở preview
    const handlePreviewClick = async (e: React.MouseEvent, file: FileItem) => {
        e.stopPropagation();
        setPreviewFile(file);
        await fetchFileContent(file.id);
    };

    return (
        <div
            className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 min-h-0"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Drag & Drop Overlay */}
            {isDragging && (
                <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-sm border-2 border-dashed 
                    border-blue-500 rounded-xl flex items-center justify-center transition-all duration-300">
                    <div className="text-center bg-white p-6 rounded-xl shadow-lg">
                        <svg className="mx-auto h-12 w-12 text-blue-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3 3V8" />
                        </svg>
                        <p className="mt-4 text-sm font-medium text-blue-600">Thả file hoặc thư mục để tải lên</p>
                    </div>
                </div>
            )}

            {/* Breadcrumb Navigation */}
            <div className="p-2 md:p-4 md:pb-2">
                {currentFolderId && (
                    <div className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm mb-2 overflow-x-auto whitespace-nowrap">
                        <span
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 
                            cursor-pointer font-medium flex-shrink-0"
                            onClick={() => onBackClick()}
                        >
                            DA22TTC
                        </span>
                        {folderPath.map((folder, index) => (
                            <React.Fragment key={folder.id}>
                                <svg className="w-3 h-3 md:w-4 md:h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 
                                    cursor-pointer font-medium truncate max-w-[80px] md:max-w-[200px]"
                                    onClick={() => onBreadcrumbClick(folder.id, index)}
                                >
                                    {folder.name}
                                </span>
                            </React.Fragment>
                        ))}
                        {currentFolderName && (
                            <>
                                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span className="text-gray-800 dark:text-gray-100 font-medium truncate max-w-[100px] md:max-w-[200px]">
                                    {currentFolderName}
                                </span>
                            </>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 justify-between">
                    {currentFolderId && (
                        <button
                            onClick={onBackClick}
                            className="inline-flex items-center px-2 md:px-4 py-2 
                                text-gray-700 dark:text-gray-200 
                                bg-white dark:bg-gray-800 
                                hover:bg-gray-50 dark:hover:bg-gray-700
                                rounded-xl border border-gray-200 dark:border-gray-700 
                                shadow-sm transition-all duration-200"
                        >
                            <svg className="w-5 h-5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="hidden md:inline font-medium">Quay lại</span>
                        </button>
                    )}

                    {!isLoading && (
                        <div className={`flex flex-wrap items-center gap-2 ${currentFolderId ? '' : 'ml-auto'}`}>
                            {/* Nút ẩn/hiện thư mục */}
                            <button
                                onClick={() => setShowFolders(!showFolders)}
                                className="inline-flex items-center px-3 md:px-4 py-2 
                                    text-gray-700 dark:text-gray-200 
                                    bg-white dark:bg-gray-800 
                                    hover:bg-gray-50 dark:hover:bg-gray-700
                                    rounded-xl border border-gray-200 dark:border-gray-700 
                                    shadow-sm transition-all duration-200"
                                title={showFolders ? "Ẩn thư mục" : "Hiện thư mục"}
                            >
                                <svg
                                    className="w-5 h-5 md:mr-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    style={{
                                        color: showFolders ? 'currentColor' : '#9CA3AF'
                                    }}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                    />
                                </svg>
                                <span className="hidden md:inline">
                                    {showFolders ? "Ẩn thư mục" : "Hiện thư mục"}
                                </span>
                            </button>

                            {/* Dropdown bộ lọc đuôi file */}
                            <Menu as="div" className="relative">
                                <Menu.Button className="inline-flex items-center px-3 md:px-4 py-2 
                                    text-gray-700 dark:text-gray-200 
                                    bg-white dark:bg-gray-800 
                                    hover:bg-gray-50 dark:hover:bg-gray-700
                                    rounded-xl border border-gray-200 dark:border-gray-700 
                                    shadow-sm transition-all duration-200">
                                    <svg className="w-5 h-5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <span className="hidden md:inline">{selectedExtension ? `.${selectedExtension}` : 'Loại file'}</span>
                                    <svg className="w-5 h-5 hidden md:inline md:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </Menu.Button>

                                <Transition
                                    as={Fragment}
                                    enter="transition ease-out duration-100"
                                    enterFrom="transform opacity-0 scale-95"
                                    enterTo="transform opacity-100 scale-100"
                                    leave="transition ease-in duration-75"
                                    leaveFrom="transform opacity-100 scale-100"
                                    leaveTo="transform opacity-0 scale-95"
                                >
                                    <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right 
                                        bg-white dark:bg-gray-800 
                                        rounded-xl border border-gray-200 dark:border-gray-700
                                        shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none
                                        divide-y divide-gray-100 dark:divide-gray-700">
                                        <div className="px-1 py-1">
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => setSelectedExtension(null)}
                                                        className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                                            } ${selectedExtension === null ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
                                                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                    >
                                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                d="M4 6h16M4 12h16M4 18h16" />
                                                        </svg>
                                                        Tất cả
                                                    </button>
                                                )}
                                            </Menu.Item>
                                            {uniqueExtensions.map(ext => (
                                                <Menu.Item key={ext}>
                                                    {({ active }) => (
                                                        <button
                                                            onClick={() => setSelectedExtension(ext)}
                                                            className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                                                } ${selectedExtension === ext ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
                                                                } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                        >
                                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                            </svg>
                                                            .{ext}
                                                        </button>
                                                    )}
                                                </Menu.Item>
                                            ))}
                                        </div>
                                    </Menu.Items>
                                </Transition>
                            </Menu>

                            {/* Dropdown bộ lọc sắp xếp */}
                            <Menu as="div" className="relative">
                                <Menu.Button className="inline-flex items-center px-3 md:px-4 py-2 
                                    text-gray-700 dark:text-gray-200 
                                    bg-white dark:bg-gray-800 
                                    hover:bg-gray-50 dark:hover:bg-gray-700
                                    rounded-xl border border-gray-200 dark:border-gray-700 
                                    shadow-sm transition-all duration-200">
                                    <svg className="w-5 h-5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                    </svg>
                                    <span className="hidden md:inline">Sắp xếp</span>
                                    <svg className="w-5 h-5 hidden md:inline md:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </Menu.Button>

                                <Transition
                                    as={Fragment}
                                    enter="transition ease-out duration-100"
                                    enterFrom="transform opacity-0 scale-95"
                                    enterTo="transform opacity-100 scale-100"
                                    leave="transition ease-in duration-75"
                                    leaveFrom="transform opacity-100 scale-100"
                                    leaveTo="transform opacity-0 scale-95"
                                >
                                    <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right 
                                        bg-white dark:bg-gray-800 
                                        rounded-xl border border-gray-200 dark:border-gray-700
                                        shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none
                                        divide-y divide-gray-100 dark:divide-gray-700">
                                        <div className="px-1 py-1">
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => setSortCriteria(SortCriteria.Default)}
                                                        className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                                            } ${sortCriteria === SortCriteria.Default ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
                                                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                    >
                                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                d="M4 6h16M4 12h16M4 18h16" />
                                                        </svg>
                                                        Mặc định
                                                    </button>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => setSortCriteria(SortCriteria.Name)}
                                                        className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                                            } ${sortCriteria === SortCriteria.Name ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
                                                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                    >
                                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                                                        </svg>
                                                        Tên
                                                    </button>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => setSortCriteria(SortCriteria.Size)}
                                                        className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                                            } ${sortCriteria === SortCriteria.Size ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
                                                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                    >
                                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                                        </svg>
                                                        Dung lượng
                                                    </button>
                                                )}
                                            </Menu.Item>
                                            <Menu.Item>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => setSortCriteria(SortCriteria.Date)}
                                                        className={`${active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                                            } ${sortCriteria === SortCriteria.Date ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
                                                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                                                    >
                                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        Ngày tạo
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        </div>
                                    </Menu.Items>
                                </Transition>
                            </Menu>

                            {/* Nút chuyển đổi grid/list view */}
                            <button
                                onClick={() => setIsGridView(!isGridView)}
                                className="inline-flex items-center px-3 md:px-4 py-2 
                                    text-gray-700 dark:text-gray-200 
                                    bg-white dark:bg-gray-800 
                                    hover:bg-gray-50 dark:hover:bg-gray-700
                                    rounded-xl border border-gray-200 dark:border-gray-700 
                                    shadow-sm transition-all duration-200"
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
                        </div>
                    )}
                </div>
            </div>

            {/* File Grid/List với khả năng cuộn */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-8">
                <div className={`
                    grid gap-2 py-2
                    ${isGridView
                        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                        : 'grid-cols-1'}
                `}>
                    {isLoading ? (
                        [...Array(5)].map((_, index) => (
                            <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm animate-pulse">
                                <div className="flex items-center">
                                    <Skeleton
                                        circle
                                        width={24}
                                        height={24}
                                        className="mr-3"
                                        baseColor={theme === 'dark' ? '#374151' : '#f3f4f6'}
                                        highlightColor={theme === 'dark' ? '#4B5563' : '#e5e7eb'}
                                    />
                                    <Skeleton
                                        width={200}
                                        height={20}
                                        baseColor={theme === 'dark' ? '#374151' : '#f3f4f6'}
                                        highlightColor={theme === 'dark' ? '#4B5563' : '#e5e7eb'}
                                    />
                                </div>
                            </div>
                        ))
                    ) : sortedFiles.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 
                            bg-white dark:bg-gray-800 rounded-xl">
                            <svg className="w-16 h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-lg font-medium text-gray-900 dark:text-white">Thư mục trống</p>
                            <p className="text-sm text-gray-500 mt-2">Chưa có tệp tin hoặc thư mục nào</p>
                        </div>
                    ) : (
                        sortedFiles.map(file => (
                            <div
                                key={file.id}
                                className={`
                                    bg-white dark:bg-gray-800 rounded-xl 
                                    border border-gray-100 dark:border-gray-700 
                                    shadow-sm hover:shadow-md
                                    transition-all duration-200 cursor-pointer group
                                    ${file.isUploading ? 'opacity-80 pointer-events-none' : ''}
                                `}
                                onClick={() => file.mimeType === 'application/vnd.google-apps.folder' ? onFolderClick(file.id) : null}
                            >
                                <div className="p-4">
                                    <div className="flex items-center">
                                        {/* File/Folder Icon */}
                                        {file.mimeType === 'application/vnd.google-apps.folder' ? (
                                            <svg className="w-10 h-10 text-blue-500 mr-3" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 1.99 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-10 h-10 text-gray-400 mr-3" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                                            </svg>
                                        )}

                                        {/* File/Folder Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                {file.name}
                                            </div>
                                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1 space-x-4">
                                                <span>{new Date(file.createdTime).toLocaleDateString('vi-VN')}</span>
                                                {file.size && <span>{formatFileSize(file.size)}</span>}
                                            </div>
                                        </div>

                                        {/* Download Button */}
                                        {!file.isUploading && (
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* Nút xem trước - chỉ hiển thị cho các file có thể xem trước */}
                                                {file.mimeType !== 'application/vnd.google-apps.folder' &&
                                                    isPreviewableFile(file.name) && (
                                                        <button
                                                            onClick={(e) => handlePreviewClick(e, file)}
                                                            className="p-2 text-gray-500 dark:text-gray-400 
                                                        hover:text-purple-500 dark:hover:text-purple-400 
                                                        hover:bg-purple-50 dark:hover:bg-purple-900/30
                                                        rounded-lg transition-colors"
                                                            title="Xem trước"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                {/* Nút copy link - chỉ hiển thị cho file */}
                                                {file.mimeType !== 'application/vnd.google-apps.folder' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const link = generateDownloadLink(file.id);
                                                            navigator.clipboard.writeText(link);
                                                            toast.success('Đã sao chép link tải file!', {
                                                                duration: 2000,
                                                                style: {
                                                                    background: theme === 'dark' ? '#374151' : '#fff',
                                                                    color: theme === 'dark' ? '#fff' : '#000',
                                                                    border: theme === 'dark' ? '1px solid #4B5563' : '1px solid #E5E7EB',
                                                                },
                                                            });
                                                        }}
                                                        className="p-2 text-gray-500 dark:text-gray-400 
                                                        hover:text-blue-500 dark:hover:text-blue-400 
                                                        hover:bg-blue-50 dark:hover:bg-blue-900/30
                                                        rounded-lg transition-colors"
                                                        title="Sao chép link tải"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                        </svg>
                                                    </button>
                                                )}

                                                {/* Nút tải xuống - hiển thị cho cả file và thư mục */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        file.mimeType === 'application/vnd.google-apps.folder'
                                                            ? handleDownloadFolder(file.id, file.name)
                                                            : onDownload(file.id, file.name);
                                                    }}
                                                    className="p-2 text-gray-500 dark:text-gray-400 
                                                    hover:text-green-500 dark:hover:text-green-400 
                                                    hover:bg-green-50 dark:hover:bg-green-900/30
                                                    rounded-lg transition-colors"
                                                    title="Tải xuống"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Upload Progress */}
                                    {(file.isUploading || compressingFolder === file.id) && (
                                        <div className="mt-4">
                                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-300"
                                                    style={{
                                                        width: `${file.isUploading ? file.uploadProgress : compressionProgress}%`
                                                    }}
                                                />
                                            </div>
                                            <div className="text-xs font-medium text-gray-600 dark:text-gray-300 text-right mt-1">
                                                {file.isUploading ? file.uploadProgress : compressionProgress}%
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Thêm Modal Preview vào cuối, trước thẻ đóng div cuối cùng */}
            {previewFile && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                            <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
                        </div>

                        <div className="inline-block w-full max-w-4xl p-6 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                    {previewFile.name}
                                </h3>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(previewContent);
                                            toast.success('Đã sao chép nội dung!');
                                        }}
                                        className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 
                                            rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 
                                            hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                        Sao chép
                                    </button>
                                    <button
                                        onClick={() => {
                                            setPreviewFile(null);
                                            setPreviewContent('');
                                        }}
                                        className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 
                                            rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 
                                            hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Đóng
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            {isPreviewLoading ? (
                                <div className="flex items-center justify-center h-96">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                </div>
                            ) : (
                                <div className="relative">
                                    <pre className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-x-auto text-sm max-h-[70vh] overflow-y-auto">
                                        <code className="language-plaintext whitespace-pre-wrap break-words">
                                            {previewContent}
                                        </code>
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 