"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Props {
  email: string;
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 2);
  const masked = visible + "•••";
  return `${masked}@${domain}`;
}

export function AdminTwoFactorGate({ email }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setError(null);
    setMessage(null);
    setSending(true);
    const res = await fetch("/api/admin/2fa/send", { method: "POST" });
    setSending(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error || "Unable to send code.");
      return;
    }
    setMessage(`Code sent to ${maskEmail(email)}.`);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setError(null);
    setMessage(null);
    setVerifying(true);
    const res = await fetch("/api/admin/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setVerifying(false);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error || "Verification failed.");
      return;
    }
    setMessage("Verification successful. Redirecting...");
    setCode("");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--bg] px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/40 bg-[--surface]/70 backdrop-blur-xl p-8 shadow-xl space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Admin security</p>
          <h1 className="text-3xl font-semibold">Verify your login</h1>
          <p className="text-sm text-muted-foreground">
            Two-factor authentication is enabled on your account. We&apos;ll send a 6-digit code to {maskEmail(email)}.
          </p>
        </div>

        <div className="space-y-3">
          <Button type="button" variant="secondary" className="w-full" onClick={sendCode} disabled={sending}>
            {sending ? "Sending code..." : "Send code"}
          </Button>

          <form className="space-y-3" onSubmit={verifyCode}>
            <label className="text-sm font-medium text-muted-foreground">Enter code</label>
            <Input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="123456"
              className="tracking-widest text-center text-lg"
              disabled={verifying}
            />
            <Button type="submit" className="w-full" disabled={verifying}>
              {verifying ? "Verifying..." : "Verify"}
            </Button>
          </form>

          {message && <p className="text-sm text-emerald-500 text-center">{message}</p>}
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>
      </div>
    </div>
  );
}
