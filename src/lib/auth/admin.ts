import { env } from "@/config/env";

export function isAdminFromEnv(email: string): boolean {
  const list = env.ADMIN_EMAILS?.split(",").map(e => e.trim().toLowerCase()) || [];
  return list.includes(email.toLowerCase());
}

export function isAdmin(user: { email: string; role?: string }): boolean {
  if (user.role === "admin") return true;
  return isAdminFromEnv(user.email);
}

export function assertAdmin(user: { email: string; role?: string } | null) {
  if (!user || !isAdmin(user)) {
    throw new Error("FORBIDDEN_ADMIN");
  }
}