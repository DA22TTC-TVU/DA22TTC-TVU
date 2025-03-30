"use client";
import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";

import gsap from "gsap";

export default function CtaSecondaryButton() {
  const linkRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  useGSAP(() => {
    const link = linkRef.current as HTMLAnchorElement | null;

    if (link) {
      link.addEventListener("mouseenter", () => {
        setIsHovered(true);
        gsap.to(link, {
          x: 5,
          duration: 0.3,
          ease: "power2.out",
        });
      });

      link.addEventListener("mouseleave", () => {
        setIsHovered(false);
        gsap.to(link, {
          x: 0,
          duration: 0.3,
          ease: "power2.out",
        });
      });

      return () => {
        link.removeEventListener("mouseenter", () => {});
        link.removeEventListener("mouseleave", () => {});
      };
    }
  }, [isHovered]);

  return (
    <Link
      className="bg-secondary px-4 sm:px-6 lg:px-8 rounded-full shadow-md hover:shadow-lg transition-all duration-100 ease-in-out block"
      href="/"
      ref={linkRef}
    >
      <div className="flex items-center justify-between h-16">
        <div
          className={`text-neutral-darkest px-3 py-2 rounded-md text-md font-semibold flex items-center ${
            isHovered ? "space-x-2" : ""
          }`}
        >
          <div>Liên hệ ngay </div>
          {isHovered ? (
            <ArrowRight className="h-4 w-4" />
          ) : (
            <ArrowUpRight className="h-4 w-4" />
          )}
        </div>
      </div>
    </Link>
  );
}
