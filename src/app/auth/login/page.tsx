"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        throw new Error(res.error);
      }
      router.push("/");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setLoading(true);
    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-2xl border border-muted bg-[--surface] shadow-xl p-6 md:p-8"
      >
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back. Enter your credentials to continue.</p>

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-2">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-muted bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-foreground/40"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-muted bg-transparent px-3 py-2 focus:outline-none focus:ring-2 focus:ring-foreground/40"
            />
          </div>
          <button
            disabled={loading}
            className="w-full rounded-lg bg-foreground text-background py-2 font-medium transition transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onGoogle}
            className="w-full rounded-lg border border-muted text-foreground py-2 font-medium transition hover:bg-muted/60 active:scale-[0.99] disabled:opacity-60"
          >
            Continue with Google
          </button>
        </form>

        <div className="mt-6 text-sm text-muted-foreground">
          Don’t have an account?{" "}
          <Link href="/auth/signup" className="underline">Create account</Link>
        </div>
      </motion.div>
    </div>
  );
}
