import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { AdminShell, type AdminNavItem } from "@/components/admin/AdminShell";

const navItems: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "dashboard" },
  { label: "Orders", href: "/admin/orders", icon: "orders" },
  { label: "Custom Orders", href: "/admin/custom-orders", icon: "customOrders" },
  { label: "Products", href: "/admin/products", icon: "products" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const isAllowed = user && isAdmin(user);

  if (!isAllowed) {
    return (
      <div className="py-20">
        <div className="mx-auto max-w-xl rounded border border-muted bg-[--surface] p-10 text-center">
          <h1 className="text-2xl font-semibold mb-2">Access denied</h1>
          <p className="text-sm text-muted-foreground">You do not have permission to view this area.</p>
        </div>
      </div>
    );
  }

  return <AdminShell navItems={navItems}>{children}</AdminShell>;
}
