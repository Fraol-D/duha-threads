import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";

export default async function AdminOrdersPage() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-4">Forbidden</h1>
        <p>You do not have access to this area.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Orders (Admin)</h1>
      <p className="text-muted-foreground">Coming soon: management UI powered by /api/admin/orders.</p>
    </div>
  );
}
