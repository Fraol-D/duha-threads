"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { Mail, Loader2, Chrome, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { fadeInUp } from "@/lib/motion";

export default function SignupPage() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogle() {
    setGoogleLoading(true);
    setError(null);
    try {
      await signIn("google", { callbackUrl });
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("sending");
    const result = await signIn("email", { email, redirect: false, callbackUrl });
    if (result?.error) {
      setError("We couldn't send the invite. Double-check your email and try again.");
      setStatus("idle");
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={fadeInUp}
        className="w-full max-w-lg z-10"
      >
        <Card variant="glass" className="p-8 space-y-8 shadow-2xl border-white/10 backdrop-blur-xl">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Join Duha Threads</h1>
            <p className="text-sm text-muted-foreground">Create your account with Google or a magic link.</p>
          </div>

          <div className="space-y-5">
            <Button
              type="button"
              className="w-full shadow-lg shadow-primary/20 gap-2"
              size="lg"
              onClick={handleGoogle}
              disabled={googleLoading}
            >
              {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />}
              Continue with Google
            </Button>

            <div className="relative flex items-center justify-center text-xs uppercase text-muted-foreground">
              <span className="px-2 bg-transparent backdrop-blur-sm">or sign up with email</span>
              <div className="absolute inset-x-0 h-px bg-linear-to-r from-transparent via-border to-transparent" />
            </div>

            <form className="space-y-4" onSubmit={handleEmailSignup}>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Email</label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={status === "sending"}
                  className="bg-white/50 dark:bg-black/20 border-transparent focus:border-primary/50"
                />
              </div>

              <Button type="submit" className="w-full gap-2" size="lg" disabled={status === "sending"}>
                {status === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {status === "sent" ? "Resend invite" : "Email me a magic link"}
              </Button>
            </form>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50"
              >
                {error}
              </motion.div>
            )}

            {status === "sent" && !error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 text-sm text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Check your inbox—your invite link is on the way.
              </motion.div>
            )}
          </div>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="font-medium text-primary hover:underline underline-offset-4">
              Sign in
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
