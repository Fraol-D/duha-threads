"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

type ProfileClientProps = {
  user: {
    id?: string;
    email: string;
    name?: string;
    role?: string;
  };
};

export default function ProfileClient({ user }: ProfileClientProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setError(null);
    setIsLoggingOut(true);
    try {
      // Clear our custom auth token
      await fetch("/api/auth/signout", { method: "POST" });
      // Then sign out from NextAuth
      await signOut({ callbackUrl: "/", redirect: true });
    } catch (err) {
      console.error("Logout failed", err);
      setError("Failed to log out. Please try again.");
      // Force redirect even if error occurs
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-10">
      <h1 className="text-2xl font-semibold">Your profile</h1>

      <div className="rounded-xl border border-muted/60 bg-[--surface] p-4 space-y-1">
        <p className="text-sm text-muted-foreground">Signed in as:</p>
        <p className="text-base font-medium">{user.email}</p>

        {user.name && <p className="text-sm text-muted-foreground">Name: {user.name}</p>}

        {user.role && <p className="text-sm text-muted-foreground">Role: {user.role}</p>}
      </div>

      <div className="space-y-2">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="px-4 py-2 rounded-lg border border-muted/60 hover:bg-muted text-sm disabled:opacity-50"
        >
          {isLoggingOut ? "Logging out..." : "Log out"}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
