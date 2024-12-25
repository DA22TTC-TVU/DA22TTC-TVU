'use client'
import React from 'react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
    searchTerm: string;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isAISearch: boolean;
    onToggleAISearch: () => void;
    onSearch: () => void;
}

export default function Header({ searchTerm, onSearchChange, isAISearch, onToggleAISearch, onSearch }: HeaderProps) {
    const router = useRouter();

    return (
        <div className="flex flex-col md:flex-row items-center p-5 border-b bg-gradient-to-r from-white to-gray-50 shadow-sm sticky top-0 z-10">
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
                        className={`w-full px-12 ${isAISearch ? 'pr-24' : 'pr-12'} py-3.5 bg-white border border-gray-200 rounded-xl outline-none 
                        hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 
                        transition-all duration-200`}
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
                        className={`absolute ${isAISearch ? 'right-[4.5rem]' : 'right-4'} top-1/2 -translate-y-1/2 p-1.5 rounded-lg
                        transition-all duration-200 hover:bg-gray-100
                        ${isAISearch ? 'text-blue-500' : 'text-gray-400'}`}
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
            <button
                className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-2.5 rounded-xl
                hover:from-blue-600 hover:to-indigo-600 active:scale-95 shadow-md hover:shadow-lg
                transition-all duration-200 font-medium mt-4 md:mt-0"
                onClick={() => router.push('/txt')}
            >
                Ghi chú
            </button>
        </div>
    );
} 