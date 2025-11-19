"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Home,
  Shirt,
  Heart,
  ShoppingCart,
  Package,
  User as UserIcon,
  LayoutDashboard,
  Sun,
  Moon,
} from "lucide-react";
 

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; title?: string };

const baseNav: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/products", label: "Products", icon: Shirt },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/custom-orders", label: "My Orders", icon: Package },
];

export function Header() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/user/me", { cache: "no-store" });
        if (!active) return;
        if (res.ok) {
          const json = await res.json();
            // json.user.role may exist; fallback to env-based logic was handled server-side
          setIsAdmin(json.user?.role === "admin");
        }
      } catch {
        // ignore
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    // Initialize theme from storage or media query to keep toggle in sync
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("theme-preference") as "light" | "dark" | null;
    const initial = saved || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(initial);
  }, []);

  function applyTheme(next: "light" | "dark") {
    setTheme(next);
    if (typeof document !== "undefined") {
      const el = document.documentElement;
      el.classList.toggle("theme-dark", next === "dark");
    }
    if (typeof localStorage !== "undefined") localStorage.setItem("theme-preference", next);
  }

  const navItems: NavItem[] = isAdmin
    ? [
        ...baseNav,
        { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/orders", label: "Orders", icon: Package },
      ]
    : baseNav;

  function toggleTheme() {
    applyTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <header className="border-b border-muted bg-[--bg]/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          Duha Threads
        </Link>
        <nav className="hidden md:flex items-center gap-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                title={item.label}
                className="rounded-lg p-2 hover:bg-[--surface] focus:outline-none focus:ring-2 focus:ring-foreground/40"
              >
                <Icon className="h-5 w-5" />
                <span className="sr-only">{item.label}</span>
              </Link>
            );
          })}
          {!loaded && <span className="text-muted-foreground animate-pulse">…</span>}
        </nav>
        <div className="flex items-center gap-2">
          {/* Theme toggle icon */}
          <button
            aria-label="Toggle theme"
            title="Toggle theme"
            onClick={toggleTheme}
            className="inline-flex items-center justify-center rounded-full p-2 hover:bg-[--surface] focus:outline-none focus:ring-2 focus:ring-foreground/40"
          >
            {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
          {/* Profile icon navigates to profile page */}
          <Link
            href="/profile"
            aria-label="Open profile"
            title="Profile"
            className="inline-flex items-center justify-center rounded-full p-2 hover:bg-[--surface] focus:outline-none focus:ring-2 focus:ring-foreground/40"
          >
            <UserIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>
      
    </header>
  );
}
