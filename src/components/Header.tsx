'use client'
import React from 'react';

interface HeaderProps {
    searchTerm: string;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function Header({ searchTerm, onSearchChange }: HeaderProps) {
    return (
        <div className="flex flex-col md:flex-row items-center p-4 border-b">
            <h1 className="text-2xl font-medium text-gray-800 mb-4 md:mb-0">DA22TTC-TVU</h1>
            <div className="flex-1 w-full md:mx-8">
                <div className="max-w-[720px] relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={onSearchChange}
                        placeholder="Tìm kiếm tài liệu"
                        className="w-full px-12 py-3 bg-gray-100 rounded-lg outline-none hover:bg-gray-200 focus:bg-white focus:shadow-md transition-all"
                    />
                    <svg className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>
        </div>
    );
} 