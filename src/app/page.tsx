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
  const user = await getCurrentUser();
  const admin = isAdminEmail(user?.email);
  if (admin) {
    redirect("/admin/dashboard");
  }
  return <HomeClient />;
}
