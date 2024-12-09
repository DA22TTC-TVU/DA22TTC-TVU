// components/FileList.tsx
'use client'
import React, { useEffect, useState } from 'react';
import { FaFileDownload, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileImage, FaFile, FaFilePdf } from "react-icons/fa";
import { FaFileZipper } from "react-icons/fa6";
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

interface FileData {
    id: string;
    name: string;
    mimeType: string;
    size: string;
    createdTime: string;
    modifiedTime: string;
    type: string;
}

interface FileListProps {
    refresh: number;
}

interface DriveFile {
    id?: string;
    name?: string;
    mimeType?: string;
    size?: string;
    createdTime?: string;
    modifiedTime?: string;
}

const FileList: React.FC<FileListProps> = ({ refresh }) => {
    const [files, setFiles] = useState<FileData[]>([]);
    const [totalSize, setTotalSize] = useState<number>(0);
    const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const filesPerPage = 9;

    useEffect(() => {
        const fetchFiles = async () => {
            setLoading(true);
            try {
                const response = await fetch(
                    `/api/drive?page=${currentPage}&limit=${filesPerPage}`,
                    {
                        next: {
                            revalidate: 60
                        }
                    }
                );

                const data = await response.json();
                setFiles(data.files || []);
                setTotalPages(Math.ceil(data.totalFiles / filesPerPage));

                const newTotalSize = data.files.reduce(
                    (acc: number, file: FileData) => acc + parseInt(file.size),
                    0
                );
                setTotalSize(newTotalSize);

            } catch (error) {
                console.error("Lỗi khi tải files:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFiles();
    }, [currentPage, refresh]);

    const getFileType = (fileName: string): string => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'pdf': return 'PDF';
            case 'doc':
            case 'docx': return 'Word';
            case 'xls':
            case 'xlsx': return 'Excel';
            case 'ppt':
            case 'pptx': return 'PowerPoint';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif': return 'Image';
            case 'zip':
            case 'rar': return 'Archive';
            default: return 'Other';
        }
    };

    const getFileIcon = (fileType: string) => {
        switch (fileType) {
            case 'PDF': return <FaFilePdf className="text-red-500" />;
            case 'Word': return <FaFileWord className="text-blue-500" />;
            case 'Excel': return <FaFileExcel className="text-green-500" />;
            case 'PowerPoint': return <FaFilePowerpoint className="text-orange-500" />;
            case 'Image': return <FaFileImage className="text-purple-500" />;
            case 'Archive': return <FaFileZipper className="text-yellow-500" />;
            default: return <FaFile className="text-gray-500" />;
        }
    };

    const formatDateTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? 'Ngày không hợp lệ' : date.toLocaleString();
    };

    const formatSize = (size: string) => {
        const numSize = parseInt(size);
        if (numSize < 1024) return `${numSize} B`;
        else if (numSize < 1024 * 1024) return `${(numSize / 1024).toFixed(2)} KB`;
        else if (numSize < 1024 * 1024 * 1024) return `${(numSize / (1024 * 1024)).toFixed(2)} MB`;
        else return `${(numSize / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    const handleDownload = async (fileId: string, fileName: string) => {
        setDownloadingFile(fileId);
        try {
            const response = await fetch(`/api/drive/download?fileId=${fileId}`);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error downloading file:", error);
        } finally {
            setDownloadingFile(null);
        }
    };

    const FileCardSkeleton = () => (
        <div className='bg-white rounded-2xl shadow-lg overflow-hidden'>
            <div className='p-4 sm:p-6 bg-gradient-to-r from-indigo-500 to-purple-600'>
                <Skeleton height={24} width="80%" />
                <div className='flex justify-between items-center mt-2'>
                    <Skeleton height={20} width={60} />
                    <Skeleton height={20} width={40} />
                </div>
            </div>
            <div className='p-4 sm:p-6'>
                <Skeleton height={16} width="40%" className="mb-4" />
                <Skeleton height={40} width="100%" />
            </div>
        </div>
    );

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const renderPagination = () => {
        const pages = [];
        const maxVisiblePages = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Nút Previous
        pages.push(
            <button
                key="prev"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
                Trước
            </button>
        );

        // Trang đầu
        if (startPage > 1) {
            pages.push(
                <button
                    key={1}
                    onClick={() => handlePageChange(1)}
                    className="px-3 py-1 rounded-md bg-white border border-gray-300 hover:bg-gray-50"
                >
                    1
                </button>
            );
            if (startPage > 2) {
                pages.push(<span key="dots1">...</span>);
            }
        }

        // Các trang giữa
        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => handlePageChange(i)}
                    className={`px-3 py-1 rounded-md ${currentPage === i
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                >
                    {i}
                </button>
            );
        }

        // Trang cuối
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push(<span key="dots2">...</span>);
            }
            pages.push(
                <button
                    key={totalPages}
                    onClick={() => handlePageChange(totalPages)}
                    className="px-3 py-1 rounded-md bg-white border border-gray-300 hover:bg-gray-50"
                >
                    {totalPages}
                </button>
            );
        }

        // Nút Next
        pages.push(
            <button
                key="next"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
                Sau
            </button>
        );

        return pages;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className='p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-purple-100 min-h-screen'
        >
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className='mb-6'
            >
                <motion.h2
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className='text-2xl sm:text-3xl font-extrabold text-center text-indigo-800 mb-4 sm:mb-8 animate-slideDown'
                >
                    Danh sách file
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className='block sm:inline text-base sm:text-lg font-semibold text-indigo-600 mt-2 sm:mt-0 sm:ml-3 bg-indigo-100 px-2 py-1 rounded-full animate-pulse'
                    >
                        {formatSize(totalSize.toString())}
                    </motion.span>
                </motion.h2>
            </motion.div>

            <AnimatePresence>
                {loading ? (
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8'>
                        {[...Array(6)].map((_, index) => (
                            <FileCardSkeleton key={index} />
                        ))}
                    </div>
                ) : files.length === 0 ? (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className='text-center py-8 sm:py-16 bg-white rounded-xl shadow-lg'
                    >
                        <h2 className='text-2xl sm:text-3xl font-bold text-indigo-700'>Không có file nào</h2>
                    </motion.div>
                ) : (
                    <>
                        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8'>
                            {files.map((file, index) => (
                                <motion.div
                                    key={file.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className='bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 group'
                                >
                                    <div className='p-4 sm:p-6 bg-gradient-to-r from-indigo-500 to-purple-600 group-hover:from-indigo-600 group-hover:to-purple-700 transition-all duration-300'>
                                        <h3 className='text-lg sm:text-xl font-bold text-white truncate flex items-center'>
                                            {getFileIcon(file.type)}
                                            <span className="ml-2">{file.name}</span>
                                        </h3>
                                        <div className='flex justify-between items-center mt-2'>
                                            <p className='text-sm sm:text-base text-indigo-100'>{formatSize(file.size)}</p>
                                            <span className='px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs text-white'>{file.type}</span>
                                        </div>
                                    </div>
                                    <div className='p-4 sm:p-6'>
                                        <p className='text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4'>{formatDateTime(file.modifiedTime)}</p>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleDownload(file.id, file.name)}
                                            className='w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center group'
                                            disabled={downloadingFile === file.id}
                                        >
                                            <FaFileDownload className='mr-2 sm:mr-3 group-hover:animate-bounce' />
                                            {downloadingFile === file.id ? 'Đang tải...' : 'Tải về'}
                                        </motion.button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {!loading && files.length > 0 && (
                            <div className="mt-8 flex justify-center gap-2">
                                {renderPagination()}
                            </div>
                        )}
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default FileList;
