"use client";
import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { motion } from "framer-motion";
import { Menu, X, LayoutDashboard, ShoppingBag, Sparkles, Shirt, Users, BarChart3, MessageSquare } from "lucide-react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: keyof typeof iconRegistry;
};

const iconRegistry = {
  dashboard: LayoutDashboard,
  orders: ShoppingBag,
  customOrders: Sparkles,
  products: Shirt,
  users: Users,
  analytics: BarChart3,
  reviews: MessageSquare,
} as const;

interface AdminShellProps {
  navItems: AdminNavItem[];
  children: ReactNode;
}

function FullWidthWrapper({ children }: { children: ReactNode }) {
  return (
    <div
      className="w-screen"
      style={{ marginLeft: "calc(50% - 50vw)", marginRight: "calc(50% - 50vw)" }}
    >
      {children}
    </div>
  );
}

export function AdminShell({ navItems, children }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = useMemo(() => navItems, [navItems]);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/admin" || href === "/admin/dashboard") {
      return pathname === "/admin" || pathname.startsWith("/admin/dashboard");
    }
    return pathname.startsWith(href);
  };

  const renderNav = (onNavigate?: () => void) => (
    <nav className="flex-1 space-y-1 py-4">
      {items.map((item) => {
        const Icon = iconRegistry[item.icon] ?? LayoutDashboard;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => onNavigate?.()}
            className={clsx(
              "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.div
                layoutId="activeAdminNav"
                className="absolute inset-0 bg-[--surface] border border-black/5 dark:border-white/10 shadow-sm rounded-xl z-0"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <Icon className="h-4 w-4 relative z-10" />
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <FullWidthWrapper>
      <div className="flex min-h-[calc(100vh-4rem)] bg-[--bg] text-[--fg]">
        <aside className="hidden lg:flex w-64 flex-col border-r border-muted/20 bg-[--bg]/50 backdrop-blur-xl lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)]">
          <div className="px-6 py-6">
            <div className="text-lg font-bold tracking-tight">Duha Admin</div>
            <p className="text-xs text-muted-foreground">Manage the shop</p>
          </div>
          <div className="flex-1 px-4 overflow-y-auto">{renderNav()}</div>
        </aside>
        <div className="flex-1 flex flex-col">
          <div className="lg:hidden sticky top-16 z-10 border-b border-muted/20 bg-[--bg]/80 backdrop-blur-md">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                type="button"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                onClick={() => setMobileOpen((prev) => !prev)}
                className="rounded-md p-2 hover:bg-[--surface]"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="text-sm font-semibold">Admin Console</div>
              <div className="w-9" />
            </div>
          </div>
          <main className="flex-1 bg-[--bg]">
            <div className="px-4 py-6 md:px-10 lg:px-12 max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 top-16">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => setMobileOpen(false)} 
          />
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute left-0 top-0 bottom-0 w-64 bg-[--bg] border-r border-muted/20 shadow-2xl p-4 flex flex-col"
          >
            <div className="mb-6 flex items-center justify-between px-2">
              <div>
                <div className="text-base font-bold">Duha Admin</div>
                <p className="text-xs text-muted-foreground">Navigation</p>
              </div>
              <button
                type="button"
                className="rounded-md p-2 hover:bg-[--surface]"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{renderNav(() => setMobileOpen(false))}</div>
          </motion.div>
        </div>
      )}
    </FullWidthWrapper>
  );
}
