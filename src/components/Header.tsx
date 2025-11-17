"use client";
import Link from "next/link";
import { ThemeToggle } from "./ui/ThemeToggle";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/custom", label: "Custom Orders" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  return (
    <header className="border-b border-muted bg-[--bg]/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          Duha Threads
        </Link>
        <nav className="hidden md:flex gap-6 text-sm font-medium">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:opacity-80">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
