// pages/index.js
'use client'
import React, { useState, useEffect } from 'react';
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

interface DriveInfo {
  total: number;
  used: number;
  remaining: number;
}

export default function Home() {
  const [showFiles, setShowFiles] = useState<boolean>(false);
  const [files, setFiles] = useState<any[]>([]);
  const [driveInfo, setDriveInfo] = useState<DriveInfo | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    const fetchDriveInfo = async () => {
      setIsLoading(true);
      try {
        const driveResponse = await fetch('/api/drive/info');
        const driveData = await driveResponse.json();
        setDriveInfo(driveData);

        const filesResponse = await fetch('/api/drive');
        const filesData = await filesResponse.json();
        const sortedFiles = sortFilesByType(filesData.files || []);
        setFiles(sortedFiles);
      } catch (error) {
        console.error('Lỗi khi lấy danh sách thư mục:', error);
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDriveInfo();
  }, []);

  const sortFilesByType = (files: any[]) => {
    return [...files].sort((a, b) => {
      const isAFolder = a.mimeType === 'application/vnd.google-apps.folder';
      const isBFolder = b.mimeType === 'application/vnd.google-apps.folder';
      
      if (isAFolder && !isBFolder) return -1;
      if (!isAFolder && isBFolder) return 1;
      return 0;
    });
  };

  const handleFolderClick = async (folderId: string) => {
    if (currentFolderId) {
      setFolderHistory([...folderHistory, currentFolderId]);
    }
    setCurrentFolderId(folderId);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/drive?folderId=${folderId}`);
      const data = await response.json();
      setFiles(sortFilesByType(data.files));
      setShowFiles(true);
    } catch (error) {
      console.error('Lỗi:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackClick = async () => {
    if (folderHistory.length > 0) {
      const newHistory = [...folderHistory];
      const previousFolderId = newHistory.pop();
      setFolderHistory(newHistory);
      
      setIsLoading(true);
      try {
        const response = await fetch(`/api/drive${previousFolderId ? `?folderId=${previousFolderId}` : ''}`);
        const data = await response.json();
        setFiles(sortFilesByType(data.files));
        setCurrentFolderId(previousFolderId || null);
      } catch (error) {
        console.error('Lỗi khi quay lại thư mục:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      try {
        const response = await fetch('/api/drive');
        const data = await response.json();
        setFiles(sortFilesByType(data.files));
        setCurrentFolderId(null);
      } catch (error) {
        console.error('Lỗi khi quay về thư mục gốc:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDriveClick = async () => {
    setShowFiles(true);
    setCurrentFolderId(null);
    const response = await fetch('/api/drive');
    const data = await response.json();
    setFiles(data.files);
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Nhập tên thư mục mới:');
    if (folderName) {
        try {
            const response = await fetch('/api/drive/create-folder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                },
                body: JSON.stringify({
                    name: folderName,
                    parentId: currentFolderId,
                }),
            });
            const data = await response.json();
            if (data.error) {
                alert('Lỗi khi tạo thư mục');
            } else {
                alert('Tạo thư mục thành công');
                
                // Đảm bảo fetch mới nhất từ drive
                const refreshResponse = await fetch(
                    currentFolderId 
                        ? `/api/drive?folderId=${currentFolderId}`
                        : '/api/drive',
                    {
                        headers: {
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0'
                        },
                        cache: 'no-store'
                    }
                );
                const refreshData = await refreshResponse.json();
                setFiles(sortFilesByType(refreshData.files));
            }
        } catch (error) {
            console.error('Lỗi khi tạo thư mục:', error);
        }
    }
  };

  const handleUploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('parentId', currentFolderId || '');

      try {
        const response = await fetch('/api/drive/upload', {
          method: 'POST',
          headers: {
            'Cache-Control': 'no-cache',
          },
          body: formData,
        });
        const data = await response.json();
        if (data.error) {
          alert('Lỗi khi tải file lên');
        } else {
          alert('Tải file lên thành công');
          
          // Đảm bảo fetch mới nhất từ drive
          const refreshResponse = await fetch(
            currentFolderId 
              ? `/api/drive?folderId=${currentFolderId}`
              : '/api/drive',
            {
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              },
              cache: 'no-store'
            }
          );
          const refreshData = await refreshResponse.json();
          setFiles(sortFilesByType(refreshData.files));
        }
      } catch (error) {
        console.error('Lỗi khi tải file lên:', error);
      }
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
        const response = await fetch(`/api/drive/download?fileId=${fileId}`);
        const data = await response.json();
        
        if (data.downloadUrl) {
            // Tạo một thẻ a và kích hoạt nó để tải xuống
            const link = document.createElement('a');
            link.href = data.downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) {
        console.error('Lỗi khi tải file:', error);
        alert('Không thể tải file');
    }
  };

  const handleSearch = async (term: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/drive?q=${encodeURIComponent(term)}`);
      const data = await response.json();
      setFiles(sortFilesByType(data.files));
    } catch (error) {
      console.error('Lỗi khi tìm kiếm:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Debounce search
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      handleSearch(value);
    }, 500);

    setSearchTimeout(timeout);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-center p-4 border-b">
          <h1 className="text-2xl font-medium text-gray-800">DA22TTC-TVU</h1>
          <div className="flex-1 mx-8">
            <div className="max-w-[720px] relative">
              <input 
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Tìm kiếm tài liệu"
                className="w-full px-12 py-3 bg-gray-100 rounded-lg outline-none hover:bg-gray-200 focus:bg-white focus:shadow-md transition-all"
              />
              <svg className="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex">
          {/* Sidebar */}
          <div className="w-60 p-3">
            <button 
              onClick={handleCreateFolder}
              className="flex items-center space-x-2 px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all mb-4"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Mới</span>
            </button>

            <div className="relative mb-4">
              <input
                type="file"
                onChange={handleUploadFile}
                className="hidden"
                id="fileInput"
              />
              <label 
                htmlFor="fileInput"
                className="flex items-center space-x-2 px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all cursor-pointer bg-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Tải lên</span>
              </label>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-3 px-4 py-2 rounded-full hover:bg-gray-100 cursor-pointer text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>DA22TTC</span>
              </div>
            </div>

            {driveInfo && (
              <div className="mt-8 px-4 text-sm text-gray-500">
                <div className="mb-2">Bộ nhớ đã dùng</div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${(driveInfo.used / driveInfo.total) * 100}%` }}
                  />
                </div>
                <div className="mt-2">{formatBytes(driveInfo.remaining)} còn trống</div>
              </div>
            )}
          </div>

          {/* Files List */}
          <div className="flex-1 p-6">
            {currentFolderId && (
              <button
                onClick={handleBackClick}
                className="mb-4 flex items-center space-x-2 text-gray-600 hover:bg-gray-100 rounded-full p-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Quay lại</span>
              </button>
            )}

            <div className="grid grid-cols-1 gap-2">
              {isLoading ? (
                // Hiển thị 5 skeleton items khi đang loading
                [...Array(5)].map((_, index) => (
                  <div key={index} className="flex items-center px-4 py-2 rounded-lg">
                    <div className="flex items-center flex-1">
                      <Skeleton circle width={24} height={24} className="mr-3"/>
                      <Skeleton width={200} height={20}/>
                    </div>
                  </div>
                ))
              ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg">Thư mục trống</p>
                  <p className="text-sm mt-2">Chưa có tệp tin hoặc thư mục nào</p>
                </div>
              ) : (
                files.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center px-4 py-2 hover:bg-gray-100 rounded-lg cursor-pointer group"
                    onClick={() => file.mimeType === 'application/vnd.google-apps.folder' ? handleFolderClick(file.id) : null}
                  >
                    <div className="flex items-center flex-1">
                      {file.mimeType === 'application/vnd.google-apps.folder' ? (
                        <svg className="w-6 h-6 text-gray-500 mr-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-gray-500 mr-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                        </svg>
                      )}
                      <span className="text-gray-700">{file.name}</span>
                    </div>
                    
                    {file.mimeType !== 'application/vnd.google-apps.folder' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file.id, file.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-200 rounded-full"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}