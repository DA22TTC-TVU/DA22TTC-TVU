"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export default function CtaButton() {
  const linkRef = useRef(null);

  useGSAP(() => {
    const link = linkRef.current as HTMLAnchorElement | null;

    if (link) {
      link.addEventListener("mouseenter", () => {
        gsap.to(link, {
          scale: 0.95,
          y: -2,
          duration: 0.2,
          ease: "power2.out",
        });
        gsap.to(link.querySelector("svg"), {
          scale: 1.5,
          y: -2,
          duration: 0.2,
          ease: "power2.out",
        });
      });

      link.addEventListener("mouseleave", () => {
        gsap.to(link, {
          scale: 1.0,
          y: 0,
          duration: 0.2,
          ease: "power2.out",
        });
        gsap.to(link.querySelector("svg"), {
          scale: 1.0,
          y: 0,
          duration: 0.2,
          ease: "power2.out",
        });
      });

      return () => {
        link.removeEventListener("mouseenter", () => {});
        link.removeEventListener("mouseleave", () => {});
      };
    }
  }, []);

  return (
    <Link
      className="bg-secondary px-4 sm:px-6 lg:px-8 rounded-full shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out"
      href="https://zalo.me/0762605309"
      ref={linkRef}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="flex items-center justify-between h-16">
        <div className="text-neutral-darkest px-3 py-2 rounded-md text-md font-semibold flex items-center">
          Liên hệ ngay <ArrowRight className="ml-2 h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
