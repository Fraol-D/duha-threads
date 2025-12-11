import Link from "next/link";
import Image from "next/image";
import { Instagram, Send, Facebook } from "lucide-react";

const productLinks = [
  { label: "All Products", href: "/products" },
  { label: "Custom Order", href: "/custom-order" },
];

const companyLinks = [
  { label: "About Us", href: "/about" },
  { label: "FAQ", href: "/faq" },
];

const socialLinks = [
  { label: "Instagram", href: "https://instagram.com/duhathreads", icon: Instagram },
  { label: "Telegram", href: "https://t.me/duhathreads", icon: Send },
  { label: "Facebook", href: "https://facebook.com/duhathreads", icon: Facebook },
];

export function Footer() {
  return (
    <footer className="mt-auto bg-[--surface]">
      <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="rounded-3xl bg-[--bg] shadow-xl shadow-black/5 dark:shadow-white/5 p-8 md:p-10">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-5">
            <div className="md:col-span-2 space-y-4">
              <Link href="/" className="inline-flex items-center gap-3">
                <Image
                  src="/logo/logo-black.png"
                  alt="Duha Threads"
                  width={160}
                  height={44}
                  className="h-10 w-auto dark:hidden select-none"
                  priority
                />
                <Image
                  src="/logo/logo-white.png"
                  alt="Duha Threads"
                  width={160}
                  height={44}
                  className="h-10 w-auto hidden dark:inline select-none"
                  priority
                />
              </Link>
              <p className="text-sm text-[--muted-text] leading-relaxed max-w-xl">
                Crafted basics and bold statements—designed to feel good, look sharp, and last.
              </p>
              <div className="flex items-center gap-4 text-sm text-[--muted-text]">
                <span className="px-3 py-1 rounded-full bg-[--surface] text-[--fg] shadow-sm">
                  New drops weekly
                </span>
                <span className="px-3 py-1 rounded-full bg-[--surface] text-[--fg] shadow-sm">
                  Built in Addis
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[--fg]">Products</h3>
              <ul className="space-y-2">
                {productLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[--muted-text] hover:text-[--fg] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[--fg]">Company</h3>
              <ul className="space-y-2">
                {companyLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[--muted-text] hover:text-[--fg] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[--fg]">Connect</h3>
              <ul className="space-y-2">
                {socialLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2 text-sm text-[--muted-text] hover:text-[--fg] transition-colors"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[--surface] shadow-sm transition-transform group-hover:-translate-y-0.5">
                          <Icon className="h-4 w-4" />
                        </span>
                        {link.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 text-sm text-[--muted-text] md:flex-row md:items-center md:justify-between">
            <p>&copy; {new Date().getFullYear()} Duha Threads. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-[--fg] transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-[--fg] transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
