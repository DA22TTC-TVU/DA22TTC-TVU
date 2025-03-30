import Image from "next/image";
import NavLink from "./components/nav-link";
import CtaButton from "./components/cta-button";

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[9999] mt-5 mx-10 flex justify-between">
      <div className="bg-white px-4 sm:px-6 lg:px-8 rounded-full">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex items-center space-x-4">
              <NavLink href="/">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={100}
                  height={40}
                  className=""
                />
              </NavLink>
              <NavLink href="/">Giới thiệu</NavLink>
              <NavLink href="/">Tính năng</NavLink>
              <NavLink href="/">Đánh giá</NavLink>
              <NavLink href="/">Liên hệ</NavLink>
            </div>
          </div>
        </div>
      </div>
      <CtaButton />
    </nav>
  );
}
