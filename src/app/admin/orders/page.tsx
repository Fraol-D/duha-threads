import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import AdminOrdersClient from "./AdminOrdersClient";

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
    <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
      </div>
      <AdminOrdersClient />
    </div>
  );
}
