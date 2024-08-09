'use client'
import { useEffect, useState } from "react";
import anime from 'animejs';
import confetti from 'canvas-confetti';
import Image from "next/image";

export default function Home() {
  const [showText, setShowText] = useState(false);
  const [intro, setIntro] = useState(false);

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
      ticks: 20,
      gravity: 0,
      decay: 0.9,
      startVelocity: 3,
      colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#8B00FF']
    };

    confetti({
      ...defaults,
      particleCount: 7,
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
        return i * 50; // Delay cho từng chữ
      },
      duration: 1000,
      easing: "easeOutQuad",
      complete: () => {
        // Sau khi animation cho từng chữ hoàn tất, hiển thị và anim phần tử chứa "DA22TTC - TVU"
        setShowText(true);
        anime({
          targets: ".showText",
          opacity: [0, 1],
          translateY: [10, -15],
          duration: 1000,
          delay: 1000,
          easing: "easeOutQuad",
          complete(anim) {
            setTimeout(() => {
              setIntro(true);
              anime({
                targets: '.image1', // Áp dụng cho cả hai ảnh
                opacity: {
                  value: [0, 1],
                  duration: 2000,
                  easing: 'linear',
                },
                scale: {
                  value: [0.5, 1],
                  duration: 2000,
                  easing: 'linear',
                },
                rotate: {
                  value: ['0deg', '45deg'],
                  duration: 7500,
                  easing: 'easeOutSine',
                },
                easing: 'easeInOutSine',
                transformOrigin: 'center', // Đặt gốc tại giữa phần tử
                complete(anim) {
                  anime({
                    targets: '.image1',
                    rotate: {
                      value: ['45deg', '0deg'],
                      duration: 20000,
                      easing: 'easeInOutSine'
                    },
                    scale: {
                      value: [1, 1.1, 0.9],
                      duration: 20000,
                      easing: 'easeInOutSine'
                    },
                    easing: 'easeInOutSine',
                    transformOrigin: 'center',
                    loop: true, // Lặp lại hoạt ảnh
                    direction: 'alternate', // Chạy ngược lại sau khi hoàn tất một vòng
                  });

                  anime({
                    targets: '.image2',
                    rotate: {
                      value: ['-45deg', '-0deg'],
                      duration: 20000,
                      easing: 'easeInOutSine'
                    },
                    scale: {
                      value: [1, 1.1, 0.9],
                      duration: 20000,
                      easing: 'easeInOutSine'
                    },
                    easing: 'easeInOutSine',
                    transformOrigin: 'center',
                    loop: true, // Lặp lại hoạt ảnh
                    direction: 'alternate', // Chạy ngược lại sau khi hoàn tất một vòng
                  });
                },
              });

              anime({
                targets: '.image2', // Áp dụng cho cả hai ảnh
                opacity: {
                  value: [0, 1],
                  duration: 2000,
                  easing: 'linear',
                },
                scale: {
                  value: [0.5, 1],
                  duration: 2000,
                  easing: 'linear',
                },
                rotate: {
                  value: ['-0deg', '-45deg'],
                  duration: 7500,
                  easing: 'easeOutSine',
                },
                easing: 'easeInOutSine',
                transformOrigin: 'center' // Đặt gốc tại giữa phần tử
              });

            }, 500);
          },
        });

        anime({
          targets: ".changeText",
          translateY: [0, 25],
          duration: 500,
          easing: "easeOutQuad",
        });
      }
    });
  }, []);

  return (
    <>
      <div>
        <div className="fixed inset-0 flex items-center justify-center z-30">
          <Image
            src='/surface_1.png'
            alt="Nền"
            width={1499}
            height={1447}
            className={`image1 ${intro ? '' : 'opacity-0'}`}
          />
        </div>
        <div className="fixed inset-0 flex items-center justify-center z-20">
          <Image
            src='/surface_2.png'
            alt="Nền"
            width={1499}
            height={1447}
            className={`image2 ${intro ? '' : 'opacity-0'}`}
          />
        </div>
        <div className="fixed inset-0 flex items-center justify-center z-10">
          <Image
            src='/surface_bg_left.png'
            alt="Nền"
            width={1499}
            height={1447}
            className={`${intro ? '' : 'opacity-0'}`}
          />
        </div>
        <div className="fixed inset-0 flex items-center justify-center z-10">
          <Image
            src='/surface_bg_right.png'
            alt="Nền"
            width={1499}
            height={1447}
            className={`${intro ? '' : 'opacity-0'}`}
          />
        </div>
        <div className={`fixed inset-0 px-4 ${intro ? 'bg-[#004897]' : 'bg-[#140B14]'} `}>
        </div>
        <div className="fixed inset-0 z-50 flex justify-center items-center"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            shootConfetti(x, y);
          }}>
          {/* Chữ "DA22TTC - TVU" */}
          <div className="relative text-white w-screen">
            {/* Chữ "DA22TTC - TVU" */}
            <div
              className={`absolute top-0 left-0 right-0 font-[800] text-3xl text-center showText ${showText ? 'block' : 'hidden'}`}
            >
              <p>DA22TTC - TVU</p>
            </div>

            {/* Dòng chữ bên dưới */}
            <div className="absolute top-0 left-0 right-0 text-md text-center changeText">
              {splitText("Nơi chia sẽ và lưu trữ tài liệu học tập dành cho sinh viên lớp DA22TTC của TVU.")}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}