// pages/index.js
'use client'
import React, { useState, useEffect } from 'react';

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

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    const fetchDriveInfo = async () => {
      try {
        // Lấy thông tin drive
        const driveResponse = await fetch('/api/drive/info');
        const driveData = await driveResponse.json();
        setDriveInfo(driveData);

        // Lấy danh sách files
        const filesResponse = await fetch('/api/drive');
        const filesData = await filesResponse.json();
        console.log('Danh sách thư mục:', filesData.files);
        setFiles(filesData.files || []); // Đảm bảo luôn có một mảng, ngay cả khi trống
      } catch (error) {
        console.error('Lỗi khi lấy danh sách thư mục:', error);
        setFiles([]); // Đặt mảng rỗng nếu có lỗi
      }
    };
    fetchDriveInfo();
  }, []);

  const handleFolderClick = async (folderId: string) => {
    if (currentFolderId) {
      setFolderHistory([...folderHistory, currentFolderId]);
    }
    setCurrentFolderId(folderId);
    const response = await fetch(`/api/drive?folderId=${folderId}`);
    const data = await response.json();
    setFiles(data.files);
    setShowFiles(true);
  };

  const handleBackClick = async () => {
    if (folderHistory.length > 0) {
      const newHistory = [...folderHistory];
      const previousFolderId = newHistory.pop();
      setFolderHistory(newHistory);
      
      try {
        const response = await fetch(`/api/drive${previousFolderId ? `?folderId=${previousFolderId}` : ''}`);
        const data = await response.json();
        setFiles(data.files);
        setCurrentFolderId(previousFolderId || null);
      } catch (error) {
        console.error('Lỗi khi quay lại thư mục:', error);
      }
    } else {
      // Nếu không còn lịch sử, quay về thư mục gốc
      try {
        const response = await fetch('/api/drive');
        const data = await response.json();
        setFiles(data.files);
        setCurrentFolderId(null);
      } catch (error) {
        console.error('Lỗi khi quay về thư mục gốc:', error);
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
          handleDriveClick(); // Refresh the file list
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
          body: formData,
        });
        const data = await response.json();
        if (data.error) {
          alert('Lỗi khi tải file lên');
        } else {
          alert('Tải file lên thành công');
          handleDriveClick(); // Refresh the file list
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

  return (
    <div className="min-h-screen bg-gray-100">
      <div className='mx-auto py-8'>
        <h1 className='font-extrabold text-4xl mb-4 text-center text-gray-900'>
          DA22TTC-TVU
        </h1>
        <p className='text-center text-gray-700 mb-6'>
          Trang web chia sẽ file cấp tốc không đăng nhập cho sinh viên lớp DA22TTC của TVU.
        </p>

        <div className="flex">
          <div className="w-64 bg-white p-4 rounded-lg shadow-lg ml-0">
            {showFiles && (
              <>
                <button onClick={handleCreateFolder} className="mb-2 p-2 bg-blue-500 text-white rounded">
                  Tạo thư mục
                </button>
                <input type="file" onChange={handleUploadFile} className="mb-2" />
              </>
            )}
            <div
              className="cursor-pointer hover:bg-gray-100 p-4 rounded-lg transition-all"
              onDoubleClick={handleDriveClick}
            >
              <div className="flex items-center space-x-3">
                <svg
                  className="w-10 h-10 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
                  <path d="M7 7h10v2H7zM7 11h10v2H7zM7 15h7v2H7z" />
                </svg>
                <div>
                  <div className="font-medium">DA22TTC</div>
                  {driveInfo && (
                    <div className="text-sm text-gray-600">
                      {formatBytes(driveInfo.remaining)} còn trống
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {showFiles && (
            <div className="bg-white rounded-lg shadow-lg p-6 flex-1 ml-4">
              <div className="flex items-center mb-4">
                {currentFolderId && (
                  <button
                    className="p-2 rounded-full hover:bg-gray-100 transition-all"
                    onClick={handleBackClick}
                  >
                    <svg 
                      className="w-6 h-6 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                )}
              </div>
              
              <div className="grid gap-2">
                {files.map(file => (
                  <div
                    key={file.id}
                    className="hover:bg-gray-100 p-3 rounded cursor-pointer flex justify-between items-center"
                    onDoubleClick={() => file.mimeType === 'application/vnd.google-apps.folder' ? handleFolderClick(file.id) : null}
                  >
                    <span className="text-gray-800">{file.name}</span>
                    {file.mimeType !== 'application/vnd.google-apps.folder' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file.id, file.name);
                        }}
                        className="p-2 hover:bg-gray-200 rounded-full"
                      >
                        <svg 
                          className="w-5 h-5 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}