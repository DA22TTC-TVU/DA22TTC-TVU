// components/Upload.tsx
'use client';
import { FaFileCirclePlus, FaFileArrowUp, FaCheck } from 'react-icons/fa6';
import { useState, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileWithPath extends File {
    name: string;
}

interface UploadProps {
    onUploadSuccess: () => void;
}

export default function Upload({ onUploadSuccess }: UploadProps) {
    const [file, setFile] = useState<FileWithPath | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [isUpload, setIsUpload] = useState<boolean>(false);
    const [isUploaded, setIsUploaded] = useState<boolean>(false);

    const handleUpload = async () => {
        if (!file) return;
        setIsUpload(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    setProgress(percentComplete);
                }
            });

            const uploadPromise = new Promise((resolve, reject) => {
                xhr.onload = () => {
                    if (xhr.status === 200) {
                        setTimeout(() => {
                            setIsUpload(false);
                            setIsUploaded(true);
                            onUploadSuccess();
                        }, 500);
                        resolve(xhr.response);
                    } else {
                        reject(new Error('Upload failed'));
                    }
                };
                xhr.onerror = () => reject(new Error('Upload failed'));

                xhr.open('POST', '/api/drive');
                xhr.send(formData);
            });

            await uploadPromise;

            setTimeout(() => {
                setFile(null);
                setProgress(0);
                setIsUploaded(false);
            }, 3000);
        } catch (error) {
            console.error('Error uploading file:', error);
            setIsUpload(false);
        }
    };

    useEffect(() => {
        if (progress >= 100) {
            setIsUpload(false);
            setIsUploaded(true);
        }
    }, [progress]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setProgress(0);
            setIsUploaded(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center mt-8 p-6 bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-xl shadow-xl"
        >
            <label className="cursor-pointer flex flex-col items-center group">
                <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="bg-blue-500 text-white p-4 rounded-full transition-colors duration-300 group-hover:bg-blue-600"
                >
                    <FaFileCirclePlus size={40} />
                </motion.div>
                <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                />
                <span className="mt-4 text-lg font-semibold text-blue-200 group-hover:text-blue-300 transition-colors duration-300">
                    {file ? file.name : "Chọn file để tải lên"}
                </span>
            </label>

            <AnimatePresence>
                {file && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="w-full mt-6"
                    >
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleUpload}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-bold text-lg shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center"
                            disabled={isUpload}
                        >
                            <FaFileArrowUp size={20} className="mr-3" />
                            {isUpload ? "Đang tải lên..." : "Tải lên"}
                        </motion.button>

                        {(isUpload || progress > 0) && (
                            <div className="mt-6 w-full">
                                <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-600"
                                    />
                                </div>
                                <div className="mt-2 text-center text-blue-200 font-semibold">
                                    {Math.round(progress)}%
                                </div>
                            </div>
                        )}

                        {isUploaded && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6 flex items-center justify-center text-green-400"
                            >
                                <FaCheck size={24} className="mr-3" />
                                <span className="text-lg font-semibold">Tải lên thành công!</span>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
