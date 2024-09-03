// pages/index.js
'use client'
import Upload from '../components/upload';
import Download from '../components/download';
import React, { useEffect, useState } from 'react';

export default function Home() {
  const [refresh, setRefresh] = useState(false);

  const handleUploadSuccess = () => {
    setRefresh(prev => !prev); // Toggle refresh state để cập nhật danh sách
  };

  return (
    <div>
      <div className='bg-black text-center py-12 text-white px-4'>
        <h1 className='font-[800] text-3xl'>DA22TTC-TVU</h1>
        <h2 className='font-[600] text-xl mt-3'>Trang web chia sẽ file cấp tốc không đăng nhập cho lớp DA22TTC của TVU.</h2>
        <h2 className='font-[600] text-xl mt-6'>Gửi file ngay</h2>
        <Upload onUploadSuccess={handleUploadSuccess} />
      </div>
      <Download refresh={refresh} />
    </div>
  );
}