'use client'
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import FileList from '../components/FileList';
import { DriveInfo, FileItem } from '../types';
import { Dialog } from '@headlessui/react'

interface FolderBreadcrumb {
  id: string;
  name: string;
}

export default function Home() {
  const [showFiles, setShowFiles] = useState<boolean>(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [driveInfo, setDriveInfo] = useState<DriveInfo | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [currentFolderName, setCurrentFolderName] = useState<string>('');
  const [folderPath, setFolderPath] = useState<FolderBreadcrumb[]>([]);

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

  const sortFilesByType = (files: FileItem[]) => {
    return [...files].sort((a, b) => {
      const isAFolder = a.mimeType === 'application/vnd.google-apps.folder';
      const isBFolder = b.mimeType === 'application/vnd.google-apps.folder';

      if (isAFolder && !isBFolder) return -1;
      if (!isAFolder && isBFolder) return 1;
      return 0;
    });
  };

  const handleFolderClick = async (folderId: string, folderName?: string) => {
    if (currentFolderId) {
      setFolderHistory([...folderHistory, currentFolderId]);
      setFolderPath([...folderPath, { id: currentFolderId, name: currentFolderName }]);
    } else {
      setFolderHistory([]);
      setFolderPath([]);
    }

    setCurrentFolderId(folderId);
    setCurrentFolderName(folderName || '');
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

      const newPath = [...folderPath];
      const previousFolder = newPath.pop();

      setFolderHistory(newHistory);
      setFolderPath(newPath);
      setCurrentFolderId(previousFolderId || null);
      setCurrentFolderName(previousFolder?.name || '');

      setIsLoading(true);
      try {
        const response = await fetch(`/api/drive${previousFolderId ? `?folderId=${previousFolderId}` : ''}`);
        const data = await response.json();
        setFiles(sortFilesByType(data.files));
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
        setCurrentFolderName('');
        setFolderPath([]);
        setFolderHistory([]);
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

  const handleCreateFolder = () => {
    setIsCreateFolderModalOpen(true);
  };

  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const response = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({
          name: newFolderName,
          parentId: currentFolderId,
        }),
      });
      const data = await response.json();

      if (data.error) {
        alert('Lỗi khi tạo thư mục');
      } else {
        // Đóng modal và reset form
        setIsCreateFolderModalOpen(false);
        setNewFolderName('');

        // Cập nhật folderHistory và folderPath trước khi vào thư mục mới
        if (currentFolderId) {
          setFolderHistory([...folderHistory, currentFolderId]);
          setFolderPath([...folderPath, { id: currentFolderId, name: currentFolderName }]);
        }

        // Tự động vào thư mục mới tạo
        if (data.id) {
          setCurrentFolderId(data.id);
          setCurrentFolderName(newFolderName);

          // Lấy nội dung thư mục mới
          const folderResponse = await fetch(`/api/drive?folderId=${data.id}`);
          const folderData = await folderResponse.json();
          setFiles(sortFilesByType(folderData.files));
        }
      }
    } catch (error) {
      console.error('Lỗi khi tạo thư mục:', error);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleUploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Xử lý từng file
    Array.from(files).forEach(async (file) => {
      // Tạo temporary file item
      const tempFile: FileItem = {
        id: `temp-${Date.now()}-${file.name}`, // Thêm tên file vào id để unique
        name: file.name,
        mimeType: file.type,
        size: file.size,
        createdTime: new Date().toISOString(),
        isUploading: true,
        uploadProgress: 0
      };

      // Thêm file tạm vào danh sách
      setFiles(prev => sortFilesByType([...prev, tempFile]));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('parentId', currentFolderId || '');

      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/drive/upload', true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setFiles(prev => prev.map(f =>
              f.id === tempFile.id
                ? { ...f, uploadProgress: progress }
                : f
            ));
          }
        };

        xhr.onload = async () => {
          if (xhr.status === 200) {
            // Refresh lại danh sách file sau khi tất cả đã upload xong
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
          } else {
            alert(`Lỗi khi tải file ${file.name} lên`);
            setFiles(prev => prev.filter(f => f.id !== tempFile.id));
          }
        };

        xhr.onerror = () => {
          console.error(`Lỗi khi tải file ${file.name} lên`);
          setFiles(prev => prev.filter(f => f.id !== tempFile.id));
        };

        xhr.send(formData);
      } catch (error) {
        console.error(`Lỗi khi tải file ${file.name} lên:`, error);
        setFiles(prev => prev.filter(f => f.id !== tempFile.id));
      }
    });

    // Reset input để có thể chọn lại cùng file
    event.target.value = '';
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

  const handleBreadcrumbClick = async (folderId: string, index: number) => {
    // Cắt folderPath và folderHistory tới vị trí được click
    const newPath = folderPath.slice(0, index);
    const newHistory = folderHistory.slice(0, index);

    setFolderPath(newPath);
    setFolderHistory(newHistory);
    setCurrentFolderId(folderId);

    // Lấy tên thư mục từ folderPath
    const folder = folderPath[index];
    setCurrentFolderName(folder?.name || '');

    setIsLoading(true);
    try {
      const response = await fetch(`/api/drive?folderId=${folderId}`);
      const data = await response.json();
      setFiles(sortFilesByType(data.files));
    } catch (error) {
      console.error('Lỗi khi điều hướng qua breadcrumb:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1800px] mx-auto">
        <div className="md:hidden p-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <Header
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
        />

        <div className="flex relative">
          <Sidebar
            driveInfo={driveInfo}
            onCreateFolder={handleCreateFolder}
            onUploadFile={handleUploadFile}
            formatBytes={formatBytes}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            fileInputRef={React.useRef<HTMLInputElement>(null)}
          />

          <FileList
            files={files}
            isLoading={isLoading}
            currentFolderId={currentFolderId}
            currentFolderName={currentFolderName}
            folderPath={folderPath}
            onFolderClick={(id) => {
              const folder = files.find(f => f.id === id);
              handleFolderClick(id, folder?.name);
            }}
            onBreadcrumbClick={handleBreadcrumbClick}
            onBackClick={handleBackClick}
            onDownload={handleDownload}
          />
        </div>
      </div>

      <Dialog
        open={isCreateFolderModalOpen}
        onClose={() => !isCreatingFolder && setIsCreateFolderModalOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <Dialog.Title className="text-lg font-medium mb-4">
              Tạo thư mục mới
            </Dialog.Title>

            <form onSubmit={handleCreateFolderSubmit}>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nhập tên thư mục"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isCreatingFolder}
              />

              <div className="mt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => !isCreatingFolder && setIsCreateFolderModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  disabled={isCreatingFolder}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-50"
                  disabled={isCreatingFolder || !newFolderName.trim()}
                >
                  {isCreatingFolder ? 'Đang tạo...' : 'Tạo thư mục'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}