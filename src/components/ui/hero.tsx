import CtaButton from "./components/cta-button";
import CtaSecondaryButton from "./components/cta-secondary-button";
import Image from "next/image";

export default function Hero() {
  return (
    <div className="container mx-auto pt-20">
      <h1 className="text-6xl sm:text-8xl font-bold text-center text-neutral-darkest mb-4 leading-tight">
        NƠI
        <span className="bg-primary/40 px-2 py-1 rounded-md">CHIA SẼ</span>
        TẬP TIN
        <Image
          src="/documents.png"
          alt="Logo"
          width={100}
          height={100}
          className="inline-block ml-2"
        />
        <br />
        <span className="bg-secondary/40 px-2 py-1 rounded-md">LƯU TRỮ</span>
        TẠM THỜI
        <Image
          src="/folder.png"
          alt="Logo"
          width={80}
          height={80}
          className="inline-block ml-2"
        />
        VÀ
        <span className="bg-primary-light/40 px-2 py-1 rounded-md">
          TRUYỀN TẢI
        </span>
        NỘI DUNG
        <Image
          src="/data-exchange.png"
          alt="Logo"
          width={80}
          height={80}
          className="inline-block ml-2"
        />
      </h1>
      <p className="text-2xl text-center text-neutral-medium mb-24 mt-12">
        Dịch vụ hỗ trợ tốt nhất trong việc chia sẽ tập tin trong quá trình học
        thực hành ở trường Đại Học Trà Vinh
      </p>
      <div className="flex justify-center space-x-4">
        <CtaButton />
        <CtaSecondaryButton />
      </div>
    </div>
  );
}
