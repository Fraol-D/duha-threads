"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Home,
  Shirt,
  Heart,
  ShoppingCart,
  Brush,
  User as UserIcon,
  LayoutDashboard,
  Sun,
  Moon,
  List,
} from "lucide-react";
import { isAdminEmail } from "@/config/admin-public";
import { useCart } from "./CartProvider";
import { useWishlist } from "./WishlistProvider";
import { BrandLogo } from "./BrandLogo";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; title?: string };

const baseNav: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/products", label: "Products", icon: Shirt },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/custom-order", label: "Custom Builder", icon: Brush },
  { href: "/my-orders", label: "My Orders", icon: List },
];

export function Header() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { totalQuantity } = useCart();
  const { count: wishlistCount } = useWishlist();
  
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
    setScrolled(latest > 20);
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/user/me", { cache: "no-store" });
        if (!active) return;
        if (res.ok) {
          const json = await res.json();
          const email: string | undefined = json.user?.email;
          setIsAdmin(isAdminEmail(email));
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

  // Public nav items
  const navItems: NavItem[] = baseNav;

  function toggleTheme() {
    applyTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <motion.header
      variants={{
        visible: { y: 0 },
        hidden: { y: "-100%" },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className={`fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${
        scrolled 
          ? "bg-[--bg]/80 backdrop-blur-md shadow-sm" 
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
        <BrandLogo theme={theme} />
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                title={item.label}
                className="relative rounded-full px-4 py-2 text-sm font-medium hover:bg-[--surface] transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/40 flex items-center gap-2 group"
              >
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
                {item.href === '/cart' && totalQuantity > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold leading-none px-1 shadow-md animate-in fade-in zoom-in" aria-label={`Cart items: ${totalQuantity}`}>{totalQuantity}</span>
                )}
                {item.href === '/wishlist' && wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent/90 text-accent-foreground text-[10px] font-bold leading-none px-1 shadow-md animate-in fade-in zoom-in" aria-label={`Wishlist items: ${wishlistCount}`}>{wishlistCount}</span>
                )}
              </Link>
            );
          })}
          {loaded && isAdmin && (
            <Link
              href="/admin/dashboard"
              aria-label="Admin dashboard"
              title="Admin dashboard"
              className="rounded-full px-4 py-2 text-sm font-medium hover:bg-[--surface] transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/40 flex items-center gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Admin</span>
            </Link>
          )}
          {!loaded && <span className="text-muted-foreground animate-pulse px-4">…</span>}
        </nav>
        <div className="flex items-center gap-2">
          <button
            aria-label="Toggle theme"
            title="Toggle theme"
            onClick={toggleTheme}
            className="inline-flex items-center justify-center rounded-full p-2 hover:bg-[--surface] transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/40"
          >
            {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
          <Link
            href="/profile"
            aria-label="Profile"
            title="Profile"
            className="inline-flex items-center justify-center rounded-full p-2 hover:bg-[--surface] transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/40"
          >
            <UserIcon className="h-5 w-5" />
            <span className="sr-only">Profile</span>
          </Link>
        </div>
      </div>
      
    </motion.header>
  );
}
