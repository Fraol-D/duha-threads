"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/profile");
    } else {
      const data = await res.json();
      setError(data.error || "Login failed");
    }
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-semibold mb-6">Log In</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input required type="email" placeholder="Email" className="w-full border p-2 rounded" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input required type="password" placeholder="Password" className="w-full border p-2 rounded" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading} className="w-full bg-black text-white py-2 rounded disabled:opacity-50">
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>
      <p className="text-sm mt-4">Need an account? <a href="/signup" className="underline">Sign up</a></p>
    </div>
  );
}
