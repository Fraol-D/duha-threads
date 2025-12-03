import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/User";
import { toPublicUser } from "@/types/user";
import Link from "next/link";

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-4">Forbidden</h1>
        <p>You do not have access to this area.</p>
      </div>
    );
  }

  await getDb();
  const doc = await UserModel.findById(params.id);
  if (!doc) {
    notFound();
  }
  const detail = toPublicUser(doc);
  const formatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">User #{detail.id.slice(-6)}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{detail.name}</h1>
        </div>
        <Link href="/admin/users" className="text-sm text-primary hover:underline">Back to list</Link>
      </div>

      <div className="rounded-2xl border border-muted bg-[--surface] p-6 space-y-4">
        <DetailRow label="Email" value={detail.email} />
        <DetailRow label="Role" value={detail.role} />
        <DetailRow label="Status" value={detail.status} />
        <DetailRow label="Created" value={formatter.format(new Date(detail.createdAt))} />
        <DetailRow label="Updated" value={formatter.format(new Date(detail.updatedAt))} />
      </div>

      <p className="text-sm text-muted-foreground">
        All management actions (role changes, activation, deletion) are available from the main user list.
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
