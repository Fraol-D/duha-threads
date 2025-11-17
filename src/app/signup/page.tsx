"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    defaultAddress: "",
    marketingEmailOptIn: false,
    marketingSmsOptIn: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        defaultAddress: form.defaultAddress || undefined,
        marketingEmailOptIn: form.marketingEmailOptIn,
        marketingSmsOptIn: form.marketingSmsOptIn,
      }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/profile");
    } else {
      const data = await res.json();
      setError(data.error || "Signup failed");
    }
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-semibold mb-6">Create Account</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input required placeholder="Name" className="w-full border p-2 rounded" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required type="email" placeholder="Email" className="w-full border p-2 rounded" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input required type="password" placeholder="Password" className="w-full border p-2 rounded" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input required type="password" placeholder="Confirm Password" className="w-full border p-2 rounded" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
        <input placeholder="Phone (optional)" className="w-full border p-2 rounded" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input placeholder="Default Address (optional)" className="w-full border p-2 rounded" value={form.defaultAddress} onChange={(e) => setForm({ ...form, defaultAddress: e.target.value })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.marketingEmailOptIn} onChange={(e) => setForm({ ...form, marketingEmailOptIn: e.target.checked })} />
          Receive marketing emails
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.marketingSmsOptIn} onChange={(e) => setForm({ ...form, marketingSmsOptIn: e.target.checked })} />
          Receive marketing SMS
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading} className="w-full bg-black text-white py-2 rounded disabled:opacity-50">
          {loading ? "Creating..." : "Sign Up"}
        </button>
      </form>
      <p className="text-sm mt-4">Already have an account? <a href="/login" className="underline">Log in</a></p>
    </div>
  );
}
