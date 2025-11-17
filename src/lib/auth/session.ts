import { cookies } from "next/headers";
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
