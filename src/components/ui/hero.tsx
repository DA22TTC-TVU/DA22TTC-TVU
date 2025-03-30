import CtaButton from "./components/cta-button";
import CtaSecondaryButton from "./components/cta-secondary-button";
import Image from "next/image";

export default function Hero() {
  return (
    <div className="container mx-auto pt-20">
      <h1 className="text-6xl sm:text-8xl font-bold text-center text-neutral-darkest mb-4 leading-tight">
        NƠI
        <span className="relative inline-block">
          <span
            className="bg-primary/40 pl-4 pr-6 py-1 rounded-md relative z-10"
            style={{ clipPath: "polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)" }}
          >
            CHIA SẼ
          </span>
          <div
            className="absolute inset-0 bg-primary/20 -z-10 rounded-md"
            style={{ clipPath: "polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)" }}
          ></div>
        </span>
        TẬP TIN
        <Image
          src="/documents.png"
          alt="Logo"
          width={100}
          height={100}
          className="inline-block ml-2"
        />
        <br />
        <span className="relative inline-block">
          <span
            className="bg-secondary/40 px-6 py-1 rounded-md relative z-10"
            style={{ clipPath: "polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)" }}
          >
            LƯU TRỮ
          </span>
          <div
            className="absolute inset-0 bg-secondary/20 -z-10 rounded-md"
            style={{ clipPath: "polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)" }}
          ></div>
        </span>
        TẠM THỜI
        <Image
          src="/folder.png"
          alt="Logo"
          width={80}
          height={80}
          className="inline-block ml-2"
        />
        VÀ
        <span className="px-2 py-1 rounded-md">TRUYỀN TẢI</span>
        NỘI DUNG
        <Image
          src="/data-exchange.png"
          alt="Logo"
          width={80}
          height={80}
          className="inline-block ml-2"
        />
      </h1>
      <div className="text-2xl text-center text-neutral-medium mb-24 mt-12 flex items-center justify-center space-x-4">
        <p>
          Dịch vụ hỗ trợ chia sẻ tập tin giúp tối ưu cho việc học tập và thực
          hành tại
        </p>
        <svg width="330" height="80">
          <rect
            x="2"
            y="2"
            width="320"
            height="76"
            rx="13"
            fill="none"
            stroke="#004AAD"
            strokeWidth="4"
            strokeDasharray="10, 5"
            style={{
              animation: "dash 5s linear infinite",
            }}
          />
          <image
            href="/tvu-logo.jpeg"
            x="20"
            y="15"
            height="50px"
            width="50px"
          />
          <text
            x="80"
            y="45"
            fill="black"
            fontSize="16"
            fontWeight="bold"
            fontStyle="italic"
          >
            TRƯỜNG ĐẠI HỌC TRÀ VINH
          </text>
        </svg>
      </div>
      <div className="flex justify-center space-x-4 relative">
        <CtaButton />
        <CtaSecondaryButton />
        <Image
          src="/arrow-10.svg"
          alt="CTA Arrow"
          width={150}
          height={50}
          className="absolute bottom-[70px] left-1/2 transform -translate-x-1/2"
        />
      </div>
      <div className="absolute bottom-8 right-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="p-1.5 bg-neutral-medium bg-opacity-20 rounded-full">
            <div className="w-2 h-20 bg-neutral-medium/80 rounded-full relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1/4 bg-neutral-darkest animate-scan animation-duration-3000 animation-ease-in-out animation-infinite"></div>
            </div>
          </div>
          <span className="text-md text-neutral-darkest font-bold tracking-wider transform -translate-y-1 whitespace-nowrap">
            TIẾP TỤC
          </span>
        </div>
      </div>
    </div>
  );
}
