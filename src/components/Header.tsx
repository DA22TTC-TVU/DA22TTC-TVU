'use client'
import React from 'react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
    searchTerm: string;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function Header({ searchTerm, onSearchChange }: HeaderProps) {
    const router = useRouter();

    return (
        <div className="flex flex-col md:flex-row items-center p-6 border-b bg-gradient-to-r from-white to-gray-50 shadow-sm">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4 md:mb-0">
                DA22TTC-TVU
            </h1>
            <div className="flex-1 w-full md:mx-8">
                <div className="max-w-[720px] relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={onSearchChange}
                        placeholder="Tìm kiếm tài liệu"
                        className="w-full px-12 py-3.5 bg-white border border-gray-200 rounded-xl outline-none 
                        hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 
                        transition-all duration-200"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
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