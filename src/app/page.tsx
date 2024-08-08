'use client'
import { useEffect, useState } from "react";
import anime from 'animejs';
import confetti from 'canvas-confetti';

export default function Home() {
  const [showText, setShowText] = useState(false);

  // Hàm để tách đoạn văn thành từng từ
  const splitText = (text: string) => text.split(' ').map((word, index) => (
    <span
      key={index}
      className="inline-block el"
      style={{ opacity: 0, transform: 'translateY(10px)' }} // Thiết lập giá trị bắt đầu cho animation
    >
      {word}
      {index < text.split(' ').length - 1 && '\u00A0'}
    </span>
  ));

  const shootConfetti = (x: number, y: number) => {
    var defaults = {
      spread: 360,
      ticks: 60,
      gravity: 0,
      decay: 0.94,
      startVelocity: 3,
      colors: ['FFE400', 'FFBD00', 'E89400', 'FFCA6C', 'FDFFB8']
    };

    confetti({
      ...defaults,
      particleCount: 4,
      scalar: 1.2,
      shapes: ['star'],
      origin: { x: x / window.innerWidth, y: y / window.innerHeight }
    });
  };

  useEffect(() => {
    // Animation cho các chữ
    anime({
      targets: ".el",
      opacity: [0, 1],
      translateY: [10, 0],
      delay: function (el, i) {
        return i * 100; // Delay cho từng chữ
      },
      duration: 1000,
      easing: "easeOutQuad",
      complete: () => {
        // Sau khi animation cho từng chữ hoàn tất, hiển thị và anim phần tử chứa "DA22TTC - TVU"
        setShowText(true);
        anime({
          targets: ".showText",
          opacity: [0, 1],
          translateY: [10, 0],
          duration: 1000,
          delay: 1000,
          easing: "easeOutQuad",
        });

        anime({
          targets: ".changeText",
          translateY: [0, 10],
          duration: 500,
          easing: "easeOutQuad",
        });
      }
    });
  }, []);

  return (
    <div
      className="h-screen flex px-4 flex-col justify-center items-center bg-[#140B14]"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        shootConfetti(x, y);
      }}
    >
      <div className="text-white">
        <div
          className={`text-center font-[800] text-3xl showText ${showText ? 'block' : 'hidden'}`} // Chuyển giữa display: block và none
        >
          <p>DA22TTC - TVU</p>
        </div>
      </div>
      <div className="text-white text-md text-center changeText">
        {splitText("Nơi chia sẽ và lưu trữ tài liệu học tập dành cho sinh viên lớp DA22TTC của TVU.")}
      </div>
    </div>
  );
}
