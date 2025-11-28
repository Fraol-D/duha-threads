"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { fadeInUp } from "@/lib/motion";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    address: "",
    marketing: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push("/login?registered=true");
      } else {
        const data = await res.json();
        setError(data.error || "Signup failed");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
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
            <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
            <p className="text-sm text-muted-foreground">Join Duha Threads to start customizing</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Full Name</label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="bg-white/50 dark:bg-black/20 border-transparent focus:border-primary/50"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Email</label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@example.com"
                  className="bg-white/50 dark:bg-black/20 border-transparent focus:border-primary/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Password</label>
                  <Input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="bg-white/50 dark:bg-black/20 border-transparent focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Confirm Password</label>
                  <Input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="bg-white/50 dark:bg-black/20 border-transparent focus:border-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Phone</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="bg-white/50 dark:bg-black/20 border-transparent focus:border-primary/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Address</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, City, State, Zip"
                  className="bg-white/50 dark:bg-black/20 border-transparent focus:border-primary/50"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="marketing"
                  checked={formData.marketing}
                  onChange={(e) => setFormData({ ...formData, marketing: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="marketing" className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Receive updates about new drops and features
                </label>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50"
              >
                {error}
              </motion.div>
            )}

            <Button type="submit" className="w-full shadow-lg shadow-primary/20" size="lg" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

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
