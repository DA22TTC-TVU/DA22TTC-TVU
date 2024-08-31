// components/Upload.tsx
'use client';
import { FaFileCirclePlus } from 'react-icons/fa6';
import { FaFileArrowUp } from 'react-icons/fa6';
import { FaCheck } from "react-icons/fa";
import { useState, useEffect, ChangeEvent } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

interface FileWithPath extends File {
    name: string;
}

interface UploadProps {
    onUploadSuccess: () => void; // Callback để thông báo khi tải lên thành công
}

export default function Upload({ onUploadSuccess }: UploadProps) {
    const [file, setFile] = useState<FileWithPath | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [isUpload, setIsUpload] = useState<boolean>(false);
    const [isUploaded, setIsUploaded] = useState<boolean>(false);

    const handleUpload = () => {
        if (!file) return;

        const storageRef = ref(storage, `files/${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);
        setIsUpload(true);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setProgress(progress);
            },
            (error) => {
                console.error(error);
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then(() => {
                    setIsUpload(false);
                    setIsUploaded(true);
                    onUploadSuccess(); // Gọi callback khi tải lên thành công
                });
            }
        );
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
            setProgress(0); // Reset progress khi chọn file mới
        }
    };

    return (
        <div className="flex flex-col items-center mt-4">
            <label className="cursor-pointer flex flex-col items-center">
                <FaFileCirclePlus size={30} />
                <input
                    type="file"
                    className="hidden" // Ẩn input bằng Tailwind CSS
                    onChange={handleFileChange}
                />
                {file && (
                    <span className="mt-2 text-center text-sm">{file.name}</span>
                )}
            </label>
            {file && (
                <>
                    <button
                        onClick={handleUpload}
                        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center"
                    >
                        <FaFileArrowUp size={20} />
                        <span className="ml-2">Tải lên</span>
                    </button>
                    {isUpload && (
                        <div className="relative w-[25vw] mt-4">
                            <div className="absolute top-0 left-0 w-full h-4 bg-gray-200 rounded-full">
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <div className='mt-6 text-md'>{Math.round(progress)}%</div>
                        </div>
                    )}
                    {isUploaded && (
                        <div className='mt-4 flex justify-center items-center text-green-500'>
                            <FaCheck size={25} className='mx-2' />
                            <p>Tải lên thành công!</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
