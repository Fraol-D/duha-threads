"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { PublicUser } from "@/types/user";
import { Shield, ShieldCheck, Trash2, UserPlus, X } from "lucide-react";

interface UsersResponse {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  users: PublicUser[];
}

type RoleFilter = "all" | "user" | "admin";
type StatusFilter = "all" | "active" | "inactive";

const roleFilterOptions = [
  { label: "All roles", value: "all" },
  { label: "Users", value: "user" },
  { label: "Admins", value: "admin" },
];

const statusFilterOptions = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const roleToggleLabel: Record<"user" | "admin", string> = {
  user: "Promote to admin",
  admin: "Demote to user",
};

const statusToggleLabel: Record<"active" | "inactive", string> = {
  active: "Deactivate",
  inactive: "Activate",
};

const pageSize = 10;

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return fallback;
}

type ActionKind = "role" | "status" | "delete";

export default function AdminUsersClient() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typedSearch, setTypedSearch] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<PublicUser | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccessPassword, setCreateSuccessPassword] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "user" | "admin",
    status: "active" as "active" | "inactive",
  });
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [actionState, setActionState] = useState<{ id: string; kind: ActionKind } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PublicUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (search) params.set("q", search);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      try {
        const res = await fetch(`/api/users?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) {
          const message = res.status === 403 ? "Forbidden" : "Failed to load users";
          if (!cancelled) {
            setError(message);
            setData(null);
          }
          return;
        }
        const json: UsersResponse = await res.json();
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("Network error");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [page, roleFilter, statusFilter, search, refreshIndex]);

  function applySearch() {
    setPage(1);
    setSearch(typedSearch.trim());
  }

  function resetSearch() {
    setTypedSearch("");
    if (search) {
      setSearch("");
      setPage(1);
    }
  }

  const isActionPending = (id: string, kind: ActionKind) => actionState?.id === id && actionState?.kind === kind;

  const removeUserFromState = (id: string) => {
    setData((prev) => {
      if (!prev) return prev;
      const filtered = prev.users.filter((u) => u.id !== id);
      if (filtered.length === prev.users.length) return prev;
      const nextTotalCount = Math.max(prev.totalCount - 1, 0);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotalCount / prev.pageSize));
      return {
        ...prev,
        totalCount: nextTotalCount,
        totalPages: nextTotalPages,
        users: filtered,
      };
    });
    if (detailUser?.id === id) {
      setDetailUser(null);
    }
  };

  async function mutateUser(
    id: string,
    updates: Partial<{ role: "user" | "admin"; status: "active" | "inactive" }>,
    kind: Exclude<ActionKind, "delete">
  ) {
    setActionState({ id, kind });
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const payload = await res.json().catch(() => null);
      if (res.status === 404) {
        removeUserFromState(id);
        throw new Error("User no longer exists; list refreshed.");
      }
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to update user");
      }
      const updated = payload?.user;
      setData((prev) =>
        prev
          ? {
              ...prev,
              users: prev.users.map((u) => (u.id === id && updated ? updated : u)),
            }
          : prev
      );
      if (detailUser?.id === id && updated) {
        setDetailUser(updated);
      }
      setActionMessage({ type: "success", text: "User updated successfully." });
    } catch (err) {
      setActionMessage({ type: "error", text: getErrorMessage(err, "Failed to update user") });
    } finally {
      setActionState((prev) => (prev?.id === id && prev.kind === kind ? null : prev));
    }
  }

  async function deleteUser(id: string) {
    setActionState({ id, kind: "delete" });
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const payload = await res.json().catch(() => null);
      if (res.status === 404) {
        removeUserFromState(id);
        setActionMessage({ type: "error", text: "User already removed." });
        setDeleteTarget(null);
        return;
      }
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to delete user");
      }
      removeUserFromState(id);
      setActionMessage({ type: "success", text: "User deleted." });
      setDeleteTarget(null);
    } catch (err) {
      setActionMessage({ type: "error", text: getErrorMessage(err, "Failed to delete user") });
    } finally {
      setActionState((prev) => (prev?.id === id && prev.kind === "delete" ? null : prev));
    }
  }

  async function handleRoleToggle(user: PublicUser) {
    const nextRole = user.role === "admin" ? "user" : "admin";
    await mutateUser(user.id, { role: nextRole }, "role");
  }

  async function handleStatusToggle(user: PublicUser) {
    const nextStatus = user.status === "active" ? "inactive" : "active";
    await mutateUser(user.id, { status: nextStatus }, "status");
  }

  async function handleDelete(user: PublicUser) {
    setDeleteTarget(user);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccessPassword(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Failed to create user");
      }
      const json = await res.json();
      setCreateSuccessPassword(json.generatedPassword ?? null);
      setCreateForm({ name: "", email: "", password: "", role: "user", status: "active" });
      setData((prev) =>
        prev
          ? {
              ...prev,
              users: page === 1 ? [json.user, ...prev.users].slice(0, pageSize) : prev.users,
              totalCount: prev.totalCount + 1,
            }
          : prev
      );
    } catch (err) {
      setCreateError(getErrorMessage(err, "Failed to create user"));
    } finally {
      setCreateLoading(false);
    }
  }

  async function openDetail(user: PublicUser) {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`);
      if (!res.ok) {
        throw new Error("Failed to load user");
      }
      const json = await res.json();
      setDetailUser(json.user);
    } catch (err) {
      setDetailUser(user);
      console.error(err);
    }
  }

  const formatDate = useMemo(() => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }), []);

  const users = data?.users ?? [];

  return (
    <div className="space-y-6">
      {actionMessage && (
        <div
          className={clsx(
            "rounded-2xl border px-4 py-3 text-sm",
            actionMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          )}
        >
          {actionMessage.text}
        </div>
      )}
      <Card variant="glass" className="p-4 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Search name or email"
              value={typedSearch}
              onChange={(e) => setTypedSearch(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySearch();
              }}
            />
            <Button variant="secondary" onClick={applySearch} disabled={loading}>Search</Button>
            {search && (
              <Button variant="ghost" onClick={resetSearch} disabled={loading}>Reset</Button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={roleFilter} onChange={(v) => { setRoleFilter(v as RoleFilter); setPage(1); }} options={roleFilterOptions} className="min-w-40" />
            <Select value={statusFilter} onChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1); }} options={statusFilterOptions} className="min-w-40" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            New user
          </Button>
          <Button variant="secondary" onClick={() => { setPage(1); setRefreshIndex((i) => i + 1); }} disabled={loading}>
            Refresh
          </Button>
        </div>
      </Card>

      <Card className="p-0">
        {loading && <div className="p-6 text-sm text-muted-foreground">Loading users…</div>}
        {error && !loading && <div className="p-6 text-sm text-red-500">{error}</div>}
        {!loading && !error && users.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">No users found.</div>
        )}
        {!loading && !error && users.length > 0 && (
          <div className="p-4">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-muted/40">
                    <th className="py-2 text-left">User</th>
                    <th className="py-2 text-left">Email</th>
                    <th className="py-2 text-left">Role</th>
                    <th className="py-2 text-left">Status</th>
                    <th className="py-2 text-left">Created</th>
                    <th className="py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-muted/20">
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold">{user.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">#{user.id.slice(-6)}</span>
                        </div>
                      </td>
                      <td className="py-3">{user.email}</td>
                      <td className="py-3">
                        <Badge className={user.role === "admin" ? "border-green-500 text-green-600" : "border-slate-400 text-slate-600"}>
                          {user.role === "admin" ? "Admin" : "User"}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge className={user.status === "active" ? "border-emerald-500 text-emerald-600" : "border-amber-500 text-amber-600"}>
                          {user.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">{formatDate.format(new Date(user.createdAt))}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openDetail(user)}>
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRoleToggle(user)}
                            disabled={isActionPending(user.id, "role")}
                          >
                            {isActionPending(user.id, "role") ? "Updating…" : roleToggleLabel[user.role]}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStatusToggle(user)}
                            disabled={isActionPending(user.id, "status")}
                          >
                            {isActionPending(user.id, "status") ? "Updating…" : statusToggleLabel[user.status]}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => handleDelete(user)}
                            disabled={isActionPending(user.id, "delete")}
                          >
                            {isActionPending(user.id, "delete") ? "Deleting…" : "Delete"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 md:hidden">
              {users.map((user) => (
                <Card key={user.id} className="p-4 border border-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-base">{user.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">#{user.id.slice(-6)}</p>
                    </div>
                    <Badge className={user.role === "admin" ? "border-green-500 text-green-600" : "border-slate-400 text-slate-600"}>
                      {user.role === "admin" ? "Admin" : "User"}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="text-right max-w-[60%] truncate" title={user.email}>{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className={user.status === "active" ? "text-emerald-600" : "text-amber-600"}>{user.status}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Created</span>
                      <span>{formatDate.format(new Date(user.createdAt))}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => openDetail(user)}>
                      Details
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => handleRoleToggle(user)}>
                      {user.role === "admin" ? "Demote" : "Promote"}
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => handleStatusToggle(user)}>
                      {user.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-red-600"
                      onClick={() => handleDelete(user)}
                      disabled={isActionPending(user.id, "delete")}
                    >
                      {isActionPending(user.id, "delete") ? "Deleting…" : "Delete"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-muted/40 text-sm">
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= data.totalPages || loading} onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {createOpen && (
        <Dialog onClose={() => setCreateOpen(false)}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Create user</h2>
                <p className="text-sm text-muted-foreground">You can leave password empty to auto-generate.</p>
              </div>
              <button className="rounded-full p-2 hover:bg-[--surface]" onClick={() => setCreateOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={submitCreate}>
              <Input placeholder="Name" value={createForm.name} onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))} required disabled={createLoading} />
              <Input placeholder="Email" type="email" value={createForm.email} onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))} required disabled={createLoading} />
              <Input placeholder="Password (leave blank to auto-generate)" type="password" value={createForm.password} onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))} disabled={createLoading} />
              <div className="grid gap-3 md:grid-cols-2">
                <Select value={createForm.role} onChange={(v) => setCreateForm((prev) => ({ ...prev, role: v as "user" | "admin" }))} options={[{ label: "Role: User", value: "user" }, { label: "Role: Admin", value: "admin" }]} />
                <Select value={createForm.status} onChange={(v) => setCreateForm((prev) => ({ ...prev, status: v as "active" | "inactive" }))} options={[{ label: "Status: Active", value: "active" }, { label: "Status: Inactive", value: "inactive" }]} />
              </div>
              {createError && <p className="text-sm text-red-500">{createError}</p>}
              {createSuccessPassword && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-800">
                  Generated password: <span className="font-semibold">{createSuccessPassword}</span>
                </div>
              )}
              <div className="flex gap-3">
                <Button type="submit" disabled={createLoading} className="flex-1">
                  {createLoading ? "Creating…" : "Create"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </Dialog>
      )}

      {detailUser && (
        <Dialog onClose={() => setDetailUser(null)}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{detailUser.name}</h2>
                <p className="text-sm text-muted-foreground">User #{detailUser.id.slice(-6)}</p>
              </div>
              <button className="rounded-full p-2 hover:bg-[--surface]" onClick={() => setDetailUser(null)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{detailUser.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role</span>
                <span className="flex items-center gap-2">
                  {detailUser.role === "admin" ? <ShieldCheck className="h-4 w-4 text-emerald-500" /> : <Shield className="h-4 w-4 text-slate-500" />}
                  {detailUser.role}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span>{detailUser.status}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate.format(new Date(detailUser.createdAt))}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Updated</span>
                <span>{formatDate.format(new Date(detailUser.updatedAt))}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => handleRoleToggle(detailUser)}>
                {roleToggleLabel[detailUser.role]}
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => handleStatusToggle(detailUser)}>
                {statusToggleLabel[detailUser.status]}
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full text-red-600"
              onClick={() => handleDelete(detailUser)}
              disabled={isActionPending(detailUser.id, "delete")}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete user
            </Button>
          </div>
        </Dialog>
      )}

      {deleteTarget && (
        <Dialog onClose={() => (!isActionPending(deleteTarget.id, "delete") ? setDeleteTarget(null) : undefined)}>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Delete user</h2>
            <p className="text-sm text-muted-foreground">
              This will permanently remove <span className="font-semibold">{deleteTarget.email}</span> and cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setDeleteTarget(null)}
                disabled={isActionPending(deleteTarget.id, "delete")}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 bg-red-600 text-white hover:bg-red-500"
                onClick={() => deleteUser(deleteTarget.id)}
                disabled={isActionPending(deleteTarget.id, "delete")}
              >
                {isActionPending(deleteTarget.id, "delete") ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function Dialog({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:py-12">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-lg rounded-2xl border border-muted/40 bg-[--surface] p-6 shadow-xl">
        {children}
      </Card>
    </div>
  );
}
