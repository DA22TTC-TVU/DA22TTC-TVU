// pages/index.js
'use client'
import Upload from '../components/upload';
import Download from '../components/download';
import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function Home() {
  const [refresh, setRefresh] = useState(false);

  const handleUploadSuccess = () => {
    setRefresh(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-pink-950 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className='container mx-auto text-center py-8 sm:py-16 text-white'
      >
        <h1 className='font-extrabold text-4xl sm:text-6xl mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300'>
          DA22TTC-TVU
        </h1>
        <h2 className='font-semibold text-lg sm:text-2xl mt-4 sm:mt-6 mb-6 sm:mb-8 text-gray-300'>
          Trang web chia sẽ file cấp tốc không đăng nhập cho lớp DA22TTC của TVU.
        </h2>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="max-w-xl mx-auto bg-white bg-opacity-20 rounded-lg p-4 sm:p-8 backdrop-filter backdrop-blur-lg shadow-xl"
        >
          <h2 className='font-bold text-2xl sm:text-3xl mb-4 sm:mb-6 text-blue-300'>Gửi file ngay</h2>
          <Upload onUploadSuccess={handleUploadSuccess} />
        </motion.div>
      </motion.div>
      <Download refresh={refresh} />
    </div>
  );
}