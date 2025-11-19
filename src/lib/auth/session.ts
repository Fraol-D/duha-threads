import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifyAuthToken, signAuthToken } from "@/lib/auth/token";
import { getDb } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/User";
import { toPublicUser } from "@/types/user";

export async function getCurrentUser() {
  const store = await cookies();
  const token = (store as any).get ? (store as any).get(COOKIE_NAME)?.value : undefined;
  if (!token) return null;
  const payload = verifyAuthToken(token);
  if (!payload) return null;
  await getDb();
  const user = await UserModel.findById(payload.uid);
  if (!user) return null;
  return toPublicUser(user as any);
}

export async function verifyAuth(req: NextRequest): Promise<{ user: { id: string; email: string; role: "user" | "admin" } | null }> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return { user: null };
  
  const payload = verifyAuthToken(token);
  if (!payload) return { user: null };
  
  await getDb();
  const user = await UserModel.findById(payload.uid);
  if (!user) return { user: null };
  
  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      role: (user as any).role || "user",
    },
  };
}

export async function setAuthCookie(userId: string) {
  const token = signAuthToken(userId);
  const store = await cookies();
  (store as any).set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearAuthCookie() {
  const store = await cookies();
  (store as any).delete(COOKIE_NAME);
}

// Helpers to attach cookies directly on a NextResponse (more reliable in some runtimes)
export function attachAuthCookie(res: NextResponse, userId: string) {
  const token = signAuthToken(userId);
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days, aligns with JWT expiry
  });
  return res;
}

export function attachClearAuthCookie(res: NextResponse) {
  res.cookies.delete(COOKIE_NAME);
  return res;
}
