"use client";
import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Menu, X, LayoutDashboard, ShoppingBag, Sparkles, Shirt, Users, BarChart3 } from "lucide-react";

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
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors border-l-2",
              active
                ? "border-token bg-token/10 text-token"
                : "border-transparent text-muted-foreground hover:border-muted hover:bg-[--surface] hover:text-[--fg]"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <FullWidthWrapper>
      <div className="flex min-h-[calc(100vh-5rem)] bg-[--bg] text-[--fg]">
        <aside className="hidden lg:flex w-64 flex-col border-r border-muted bg-[--surface]" style={{ minHeight: "calc(100vh - 5rem)" }}>
          <div className="px-4 py-5 border-b border-muted">
            <div className="text-lg font-semibold tracking-tight">Duha Admin</div>
            <p className="text-xs text-muted-foreground">Manage the shop</p>
          </div>
          <div className="flex-1 px-3 overflow-y-auto">{renderNav()}</div>
        </aside>
        <div className="flex-1 flex flex-col">
          <div className="lg:hidden sticky top-0 z-10 border-b border-muted bg-[--bg]">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                type="button"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                onClick={() => setMobileOpen((prev) => !prev)}
                className="rounded-md border border-muted p-2"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="text-sm font-semibold">Admin Console</div>
              <div className="w-9" />
            </div>
          </div>
          <main className="flex-1 bg-[--bg]">
            <div className="px-4 py-6 md:px-10 lg:px-12">{children}</div>
          </main>
        </div>
      </div>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-[--surface] shadow-2xl p-4 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-base font-semibold">Duha Admin</div>
                <p className="text-xs text-muted-foreground">Navigation</p>
              </div>
              <button
                type="button"
                className="rounded-md border border-muted p-2"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{renderNav(() => setMobileOpen(false))}</div>
          </div>
        </div>
      )}
    </FullWidthWrapper>
  );
}
