import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import HomeClient from "../components/HomeClient";
import { env } from "@/config/env";

function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const list = (env.ADMIN_EMAILS || "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export default async function RootPage() {
  // Wrap in try-catch to handle DB connection failures gracefully
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (err) {
    // Log but don't crash - user will be treated as logged out
    console.warn('[RootPage] Failed to get current user:', (err as Error).message);
  }
  
  const admin = isAdminEmail(user?.email);
  if (admin) {
    redirect("/admin/dashboard");
  }
  return <HomeClient />;
}
