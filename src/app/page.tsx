import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import HomeClient from "../components/HomeClient";

export default async function RootPage() {
  // Wrap in try-catch to handle DB connection failures gracefully
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (err) {
    // Log but don't crash - user will be treated as logged out
    console.warn('[RootPage] Failed to get current user:', (err as Error).message);
  }
  
  if (user?.role === "admin") {
    redirect("/admin/dashboard");
  }
  return <HomeClient />;
}
