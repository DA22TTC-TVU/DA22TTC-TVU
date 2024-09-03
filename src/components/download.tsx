// components/FileList.tsx
'use client'
import React, { useEffect, useState } from 'react';
import { storage, ref, listAll, getMetadata, getDownloadURL } from '../lib/firebase';
import { FaFileDownload } from "react-icons/fa";

interface FileData {
    name: string;
    fullPath: string;
    createdAt: number;
    updatedAt: number;
    size: number; // Thêm thuộc tính size
}

interface FileListProps {
    refresh: boolean; // Prop để kiểm tra khi cần làm mới danh sách
}

const FileList: React.FC<FileListProps> = ({ refresh }) => {
    const [files, setFiles] = useState<FileData[]>([]);
    const [totalSize, setTotalSize] = useState<number>(0); // Trạng thái cho tổng dung lượng
    const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

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
                        const size = metadata.size || 0; // Lấy kích thước file

                        return {
                            name: metadata.name,
                            fullPath: itemRef.fullPath,
                            createdAt,
                            updatedAt,
                            size
                        };
                    })
                );

                // Tính tổng dung lượng của tất cả các file
                const totalSize = filesData.reduce((acc, file) => acc + file.size, 0);
                setTotalSize(totalSize);

                // Sắp xếp theo ngày cập nhật, từ mới nhất đến cũ nhất
                filesData.sort((a, b) => b.updatedAt - a.updatedAt);

                setFiles(filesData);
            } catch (error) {
                console.error("Error fetching files:", error);
            }
        };

        fetchFiles();
    }, [refresh]); // Thực hiện lại khi refresh thay đổi

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

    return (
        <div className='p-6'>
            {files.length === 0 &&
                <h2 className='text-xl text-center font-bold'>Hiện không có file nào...</h2>
            }
            {files.length > 0 &&
                <div>
                    <h2 className='text-xl text-center font-bold mb-4'>Danh sách file đã tải lên ({formatSize(totalSize)})</h2>
                    <div className='flex flex-wrap justify-center items-center'>
                        {files.map(file => (
                            <div key={file.fullPath} className='mb-4 mx-4'>
                                <div className='border border-black rounded-xl px-4 py-2'>
                                    <span className='text-blue-600'>{file.name}</span>
                                    <span className='text-gray-600'> ({formatSize(file.size)})</span>
                                    <div className='flex flex-col items-center justify-center'>
                                        <p className='mt-1 text-gray-600 mr-4'>{formatDateTime(file.updatedAt)}</p>
                                        <button
                                            onClick={() => handleDownload(file.fullPath)}
                                            className='mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'
                                            disabled={downloadingFile === file.fullPath}
                                        >
                                            <div className='flex justify-center items-center'>
                                                <FaFileDownload className='mr-2' />
                                                {downloadingFile === file.fullPath ? 'Đang tải...' : 'Tải về'}
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div >
            }
        </div >
    );
};

export default FileList;
