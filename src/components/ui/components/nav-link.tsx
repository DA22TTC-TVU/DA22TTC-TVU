import Link from "next/link";
import { ReactNode } from "react";

interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export default function NavLink({
  href,
  children,
  className = "",
}: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`text-neutral-darkest px-3 py-2 rounded-md text-sm font-medium hover:text-primary transition-colors duration-200 ease-in-out ${className}`}
    >
      {children}
    </Link>
  );
}
