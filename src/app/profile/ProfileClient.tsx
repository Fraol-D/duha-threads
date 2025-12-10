"use client";

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
  return (
    <div className="max-w-2xl mx-auto space-y-6 py-10">
      <h1 className="text-2xl font-semibold">Your profile</h1>

      <div className="rounded-xl border border-muted/60 bg-[--surface] p-4 space-y-1">
        <p className="text-sm text-muted-foreground">Signed in as:</p>
        <p className="text-base font-medium">{user.email}</p>

        {user.name && <p className="text-sm text-muted-foreground">Name: {user.name}</p>}

        {user.role && <p className="text-sm text-muted-foreground">Role: {user.role}</p>}
      </div>

      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="px-4 py-2 rounded-lg border border-muted/60 hover:bg-muted text-sm"
      >
        Log out
      </button>
    </div>
  );
}
