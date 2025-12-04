"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  defaultAddress?: string;
  marketingEmailOptIn: boolean;
  marketingSmsOptIn: boolean;
  role: "user" | "admin";
  twoFactorEnabled?: boolean;
  twoFactorVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [twoFactorMessage, setTwoFactorMessage] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorSaving, setTwoFactorSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/user/me");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        setError("Failed to load profile");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setUser(data.user);
      setLoading(false);
    })();
  }, [router]);

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const res = await fetch("/api/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: user.name,
        phone: user.phone,
        defaultAddress: user.defaultAddress,
        marketingEmailOptIn: user.marketingEmailOptIn,
        marketingSmsOptIn: user.marketingSmsOptIn,
      }),
    });
    if (!res.ok) {
      setError("Update failed");
    } else {
      const data = await res.json();
      setUser(data.user);
    }
  }

  async function logout() {
    await signOut({ callbackUrl: "/login" });
  }

  async function toggleTwoFactor(nextValue: boolean) {
    if (!user) return;
    setTwoFactorMessage(null);
    setTwoFactorError(null);
    setTwoFactorSaving(true);
    const res = await fetch("/api/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ twoFactorEnabled: nextValue }),
    });
    setTwoFactorSaving(false);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.user) {
      setTwoFactorError(data?.error || "Unable to update security settings");
      return;
    }
    setUser(data.user);
    setTwoFactorMessage(nextValue ? "Two-factor enabled. You will be asked for a code next time you visit the admin area." : "Two-factor disabled for your admin access.");
  }

  if (loading) return <div className="py-12 text-center">Loading...</div>;
  if (error) return <div className="py-12 text-center text-red-600">{error}</div>;
  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto py-12 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <button onClick={logout} className="text-sm underline">Logout</button>
      </div>
      <form onSubmit={updateProfile} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input className="w-full border p-2 rounded" value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input disabled className="w-full border p-2 rounded bg-gray-100" value={user.email} />
        </div>
        <div>
          <label className="block text-sm mb-1">Phone</label>
            <input className="w-full border p-2 rounded" value={user.phone || ""} onChange={(e) => setUser({ ...user, phone: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm mb-1">Default Address</label>
          <textarea className="w-full border p-2 rounded" value={user.defaultAddress || ""} onChange={(e) => setUser({ ...user, defaultAddress: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={user.marketingEmailOptIn} onChange={(e) => setUser({ ...user, marketingEmailOptIn: e.target.checked })} />
          Receive marketing emails
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={user.marketingSmsOptIn} onChange={(e) => setUser({ ...user, marketingSmsOptIn: e.target.checked })} />
          Receive marketing SMS
        </label>
        <button className="bg-black text-white py-2 px-4 rounded">Save Changes</button>
      </form>
      {user.role === "admin" && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Admin 2FA</h2>
              <p className="text-sm text-gray-500">Send a code to {user.email} before entering /admin.</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(user.twoFactorEnabled)}
                onChange={(e) => toggleTwoFactor(e.target.checked)}
                disabled={twoFactorSaving}
              />
              <span>{user.twoFactorEnabled ? "Enabled" : "Disabled"}</span>
            </label>
          </div>
          {user.twoFactorEnabled && user.twoFactorVerifiedAt && (
            <p className="text-xs text-gray-500">Last verified {new Date(user.twoFactorVerifiedAt).toLocaleString()}</p>
          )}
          {twoFactorMessage && <p className="text-xs text-emerald-600">{twoFactorMessage}</p>}
          {twoFactorError && <p className="text-xs text-red-500">{twoFactorError}</p>}
        </div>
      )}
      <p className="text-xs text-gray-500">Password changes and advanced account settings will be added later.</p>
    </div>
  );
}
