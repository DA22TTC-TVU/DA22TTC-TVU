'use client'
import { motion, useAnimation } from "framer-motion";

export default function Home() {

  const textAnimation = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 1 } },
  };

  const divAnimation = {
    hidden: { opacity: 0, y: -15 },
    visible: { opacity: 1, y: 0, transition: { duration: 1.25 } },
  };

  // Hàm để tách đoạn văn thành từng từ
  const splitText = (text: string) => text.split(' ').map((word, index) => (
    <motion.span
      key={index}
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
      }}
      transition={{ delay: index * 0.05 }} // Delay để animation không đồng bộ
      className="inline-block"
    >
      {word}
      {index < text.split(' ').length - 1 && '\u00A0'}
    </motion.span>
  ));

  return (
    <div className="h-screen flex px-4 flex-col justify-center items-center bg-[#140B14]">
      <motion.div
        className="text-white mb-6"
        initial="hidden"
        animate="visible"
        variants={divAnimation}
        transition={{ delay: 3 }}
      >
        <motion.div
          className="text-center font-[800] text-3xl"
          initial="hidden"
          animate="visible"
          variants={divAnimation}
        >
          <p>DA22TTC - TVU</p>
        </motion.div>
      </motion.div>
      <motion.div
        className="text-white text-md text-center"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1 }
        }}
      >
        {splitText("Nơi chia sẽ và lưu trữ tài liệu học tập dành cho sinh viên lớp DA22TTC của TVU.")}
      </motion.div>
    </div>
  );
}
