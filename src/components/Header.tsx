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
  Menu,
  X,
  Download,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { useCart } from "./CartProvider";
import { useWishlist } from "./WishlistProvider";
import { BrandLogo } from "./BrandLogo";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; title?: string };

const navItems: NavItem[] = [
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const { totalQuantity } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { canInstall, promptInstall, isStandalone } = usePwaInstallPrompt();

  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (isMobileView) {
      setHidden(false);
    } else {
      setHidden(latest > previous && latest > 150);
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
          setIsAdmin(json.user?.role === "admin");
        }
      } catch {
        // ignore auth fetch failures; header still renders
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("theme-preference") as "light" | "dark" | null;
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved || (prefersDark ? "dark" : "light"));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (event?: MediaQueryListEvent) => setIsMobileView(event ? event.matches : mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!isMobileView) setMobileMenuOpen(false);
  }, [isMobileView]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!mobileMenuOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileMenuOpen]);

  function applyTheme(next: "light" | "dark") {
    setTheme(next);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("theme-dark", next === "dark");
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("theme-preference", next);
    }
  }

  function toggleTheme() {
    applyTheme(theme === "dark" ? "light" : "dark");
  }

  const renderNavLink = (item: NavItem) => {
    const Icon = item.icon;
    const isCart = item.href === "/cart";
    const isWishlist = item.href === "/wishlist";
    const badgeValue = isCart ? totalQuantity : isWishlist ? wishlistCount : 0;

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-label={item.label}
        title={item.title || item.label}
        className="relative rounded-full px-4 py-2 text-sm font-medium hover:bg-[--surface] transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/40 flex items-center gap-2 group"
      >
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        <span className="text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
        {badgeValue > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold leading-none px-1 shadow-md" aria-label={`${item.label} count: ${badgeValue}`}>
            {badgeValue}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      <motion.header
        variants={{ visible: { y: 0 }, hidden: { y: "-100%" } }}
        animate={hidden ? "hidden" : "visible"}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
          scrolled ? "bg-[--bg]/80 backdrop-blur-md shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="hidden md:flex items-center justify-between">
            <BrandLogo theme={theme} />
            <nav className="flex items-center gap-1">
              {navItems.map(renderNavLink)}
              {loaded && isAdmin && (
                <Link
                  href="/admin/dashboard"
                  className="rounded-full px-4 py-2 text-sm font-medium hover:bg-[--surface] transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/40 flex items-center gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Admin</span>
                </Link>
              )}
              {!loaded && <span className="text-muted-foreground animate-pulse px-4">…</span>}
            </nav>
            <div className="flex items-center gap-2">
              {/* Desktop PWA Install Button */}
              {!isStandalone && canInstall && (
                <button
                  aria-label="Install app"
                  title="Install Duha Threads"
                  onClick={promptInstall}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium hover:bg-[--surface] transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/40"
                >
                  <Download className="h-4 w-4" />
                  <span>Install</span>
                </button>
              )}
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
                className="inline-flex items-center justify-center rounded-full p-2 hover:bg-[--surface] transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/40"
              >
                <UserIcon className="h-5 w-5" />
                <span className="sr-only">Profile</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between md:hidden">
            <BrandLogo theme={theme} />
            <div className="flex items-center gap-2">
              <button
                aria-label="Toggle theme"
                title="Toggle theme"
                onClick={toggleTheme}
                className="inline-flex items-center justify-center rounded-full p-2 hover:bg-[--surface] transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/40"
              >
                {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </button>
              <button
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="inline-flex items-center justify-center rounded-full p-2 hover:bg-[--surface] transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/40"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 md:hidden"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="absolute right-0 top-0 h-full w-72 max-w-[80%] bg-[--surface] border-l border-muted/40 shadow-2xl p-6 flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Menu</p>
                  <p className="text-lg font-semibold">Navigate</p>
                </div>
                <button
                  aria-label="Close menu"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-full p-2 hover:bg-muted/40"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <ul className="flex flex-col gap-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isCart = item.href === "/cart";
                    const isWishlist = item.href === "/wishlist";
                    const badgeValue = isCart ? totalQuantity : isWishlist ? wishlistCount : 0;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="flex items-center justify-between rounded-2xl px-4 py-3 text-base font-medium transition-colors hover:bg-muted/50"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5" />
                            <span>{item.label}</span>
                          </div>
                          {badgeValue > 0 && (
                            <span className="rounded-full bg-accent/80 px-2 py-0.5 text-xs text-accent-foreground font-semibold min-w-8 text-center">
                              {badgeValue}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                  <li>
                    <Link
                      href="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium transition-colors hover:bg-muted/50"
                    >
                      <UserIcon className="h-5 w-5" />
                      <span>Account</span>
                    </Link>
                  </li>
                  {loaded && isAdmin && (
                    <li>
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium transition-colors hover:bg-muted/50"
                      >
                        <LayoutDashboard className="h-5 w-5" />
                        <span>Admin console</span>
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}