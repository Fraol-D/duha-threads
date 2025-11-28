"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const LOGO_SOURCES = {
  light: "/logo/duha_logo.PNG",
  dark: "/logo/duha_logo.PNG",
};

interface BrandLogoProps {
  theme?: "light" | "dark";
  className?: string;
}

export function BrandLogo({ theme = "light", className }: BrandLogoProps) {
  const pathname = usePathname();
  const src = theme === "dark" ? LOGO_SOURCES.dark : LOGO_SOURCES.light;
  const priority = pathname === "/";

  return (
    <Link
      href="/"
      aria-label="Duha Threads home"
      className={clsx("flex items-center gap-2", className)}
    >
      <Image
        src={src}
        alt="Duha Threads logo"
        width={160}
        height={44}
        priority={priority}
        className="h-9 w-auto md:h-10 select-none"
        sizes="(max-width: 640px) 120px, 160px"
      />
    </Link>
  );
}
