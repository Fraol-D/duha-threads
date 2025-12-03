import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">Manage customer and admin accounts</p>
        </div>
      </div>
      <AdminUsersClient />
    </div>
  );
}
