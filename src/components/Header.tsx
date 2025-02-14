'use client'
import React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes'
import { ChatBubbleBottomCenterTextIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
    searchTerm: string;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isAISearch: boolean;
    onToggleAISearch: () => void;
    onSearch: () => void;
}

export default function Header({ searchTerm, onSearchChange, isAISearch, onToggleAISearch, onSearch }: HeaderProps) {
    const { theme, setTheme } = useTheme();
    const router = useRouter();

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <div className="flex flex-col md:flex-row items-center p-5 gap-4 md:gap-0 
            border-b border-gray-200 dark:border-gray-700 
            bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 
            shadow-sm sticky top-0 z-10">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4 md:mb-0">
                DA22TTC-TVU
            </h1>
            <div className="flex-1 w-full md:mx-8">
                <div className="max-w-[720px] relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={onSearchChange}
                        placeholder={isAISearch ? "Tìm kiếm bằng AI..." : "Tìm kiếm tài liệu"}
                        className="w-full px-12 py-3.5 bg-white dark:bg-gray-700 
                        border border-gray-200 dark:border-gray-600 
                        text-gray-900 dark:text-white
                        rounded-xl outline-none 
                        hover:border-blue-400 focus:border-blue-500 
                        focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 
                        transition-all duration-200"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isAISearch) {
                                onSearch();
                            }
                        }}
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>

                    <button
                        onClick={onToggleAISearch}
                        className={`absolute ${isAISearch ? 'right-[4.5rem]' : 'right-4'} 
                        top-1/2 -translate-y-1/2 p-1.5 rounded-lg
                        transition-all duration-200 
                        hover:bg-gray-100 dark:hover:bg-gray-600
                        ${isAISearch ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}
                        title={isAISearch ? "Đang dùng AI" : "Chuyển sang tìm kiếm AI"}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-5 h-5"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                    </button>

                    {isAISearch && (
                        <button
                            onClick={onSearch}
                            className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1.5 
                            bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                            transition-all duration-200 text-sm font-medium"
                        >
                            Tìm
                        </button>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-6 w-full md:w-auto justify-center">
                <button
                    onClick={toggleTheme}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 
                    transition-transform duration-300 ease-in-out hover:rotate-180 active:scale-90"
                    title="Chuyển chủ đề giao diện"
                >
                    {theme === "dark" ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-12H21m-17 0H3.34M16.95 7.05l.7.7m-12.02 0l.7-.7M16.95 16.95l.7-.7m-12.02 0l.7.7M12 8a4 4 0 110 8 4 4 0 010-8z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-900 dark:text-gray-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                        </svg>
                    )}
                </button>

                <button
                    onClick={() => router.push('/chat')}
                    className="relative group flex items-center gap-2 px-4 py-2 transition-transform duration-300 hover:scale-105"
                    title="AI-UI"
                >
                    <ChatBubbleBottomCenterTextIcon className="w-6 h-6 text-blue-500" />
                    <span className="text-gray-800 dark:text-gray-200">AI-UI</span>
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                </button>

                <button
                    onClick={() => router.push('/txt')}
                    className="relative group flex items-center gap-2 px-4 py-2 transition-transform duration-300 hover:scale-105"
                    title="Ghi chú"
                >
                    <PencilSquareIcon className="w-6 h-6 text-blue-500" />
                    <span className="text-gray-800 dark:text-gray-200">Ghi chú</span>
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></span>
                </button>
            </div>
        </div>
    );
} 