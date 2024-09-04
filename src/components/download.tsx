// components/FileList.tsx
'use client'
import React, { useEffect, useState } from 'react';
import { storage, ref, listAll, getMetadata, getDownloadURL } from '../lib/firebase';
import { FaFileDownload, FaSearch, FaFilter, FaFileAlt, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileImage, FaFile, FaFilePdf } from "react-icons/fa";
import { FaFileZipper } from "react-icons/fa6";
import { motion, AnimatePresence } from 'framer-motion';

interface FileData {
    name: string;
    fullPath: string;
    createdAt: number;
    updatedAt: number;
    size: number;
    type: string;
}

interface FileListProps {
    refresh: boolean;
}

const FileList: React.FC<FileListProps> = ({ refresh }) => {
    const [files, setFiles] = useState<FileData[]>([]);
    const [totalSize, setTotalSize] = useState<number>(0);
    const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('all');

    useEffect(() => {
        const fetchFiles = async () => {
            const listRef = ref(storage, 'files/');

            try {
                const res = await listAll(listRef);
                const filesData = await Promise.all(
                    res.items.map(async (itemRef) => {
                        const metadata = await getMetadata(itemRef);
                        const createdAt = metadata.timeCreated
                            ? new Date(metadata.timeCreated).getTime()
                            : Date.now();
                        const updatedAt = metadata.updated
                            ? new Date(metadata.updated).getTime()
                            : Date.now();
                        const size = metadata.size || 0;
                        const type = getFileType(metadata.name);

                        return {
                            name: metadata.name,
                            fullPath: itemRef.fullPath,
                            createdAt,
                            updatedAt,
                            size,
                            type
                        };
                    })
                );

                const totalSize = filesData.reduce((acc, file) => acc + file.size, 0);
                setTotalSize(totalSize);

                filesData.sort((a, b) => b.updatedAt - a.updatedAt);
                setFiles(filesData);
            } catch (error) {
                console.error("Error fetching files:", error);
            }
        };

        fetchFiles();
    }, [refresh]);

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

    const formatDateTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? 'Ngày không hợp lệ' : date.toLocaleString();
    };

    const formatSize = (size: number) => {
        if (size < 1024) return `${size} B`;
        else if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
        else if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
        else return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    const handleDownload = async (filePath: string) => {
        setDownloadingFile(filePath);
        try {
            const fileRef = ref(storage, filePath);
            const url = await getDownloadURL(fileRef);
            const link = document.createElement('a');
            link.href = url;
            link.download = filePath.split('/').pop() || 'file';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setDownloadingFile(null);
        } catch (error) {
            console.error("Error downloading file:", error);
            setDownloadingFile(null);
        }
    };

    const filteredFiles = files.filter(file =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (filterType === 'all' || file.type === filterType)
    );

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
                className='mb-6 flex flex-col sm:flex-row justify-between items-center'
            >
                <div className='relative w-full sm:w-64 mb-4 sm:mb-0'>
                    <input
                        type='text'
                        placeholder='Tìm kiếm file...'
                        className='w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300'
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <FaSearch className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
                </div>
                <div className='flex items-center'>
                    <FaFilter className='mr-2 text-gray-600' />
                    <select
                        className='bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300'
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value='all'>Tất cả</option>
                        <option value='PDF'>PDF</option>
                        <option value='Word'>Word</option>
                        <option value='Excel'>Excel</option>
                        <option value='PowerPoint'>PowerPoint</option>
                        <option value='Image'>Hình ảnh</option>
                        <option value='Archive'>Nén</option>
                        <option value='Other'>Khác</option>
                    </select>
                </div>
            </motion.div>

            <AnimatePresence>
                {filteredFiles.length === 0 ? (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className='text-center py-8 sm:py-16 bg-white rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105'
                    >
                        <h2 className='text-2xl sm:text-3xl font-bold text-indigo-700 animate-pulse'>Không tìm thấy file nào</h2>
                        <p className='mt-2 sm:mt-4 text-base sm:text-lg text-gray-600'>Hãy thử tìm kiếm với từ khóa khác</p>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className='animate-fadeIn'
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
                                {formatSize(totalSize)}
                            </motion.span>
                        </motion.h2>
                        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8'>
                            {filteredFiles.map((file, index) => (
                                <motion.div
                                    key={file.fullPath}
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
                                        <p className='text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4'>{formatDateTime(file.updatedAt)}</p>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleDownload(file.fullPath)}
                                            className='w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center group'
                                            disabled={downloadingFile === file.fullPath}
                                        >
                                            <FaFileDownload className='mr-2 sm:mr-3 group-hover:animate-bounce' />
                                            {downloadingFile === file.fullPath ? 'Đang tải...' : 'Tải về'}
                                        </motion.button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default FileList;
