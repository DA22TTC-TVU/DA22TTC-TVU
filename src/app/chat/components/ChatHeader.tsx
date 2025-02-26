// ChatHeader.tsx
'use client'
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

const ChatHeader = () => {
    const router = useRouter();

    const handleGoBack = () => {
        router.push('/');
    };

    return (
        <div className="flex items-center justify-between">
            <button
                onClick={handleGoBack}
                className="group flex items-center gap-2 px-4 py-2 
                        text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white
                        bg-white dark:bg-gray-800 rounded-xl 
                        border border-gray-200 dark:border-gray-700 
                        shadow-sm hover:shadow transition-all duration-200"
            >
                <FontAwesomeIcon
                    icon={faArrowLeft}
                    className="group-hover:-translate-x-1 transition-transform"
                />
                <span className="font-medium">Quay lại trang chủ</span>
            </button>

            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                Chat AI
            </h1>
        </div>
    );
};

export default ChatHeader;