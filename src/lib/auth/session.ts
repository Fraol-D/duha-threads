import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { COOKIE_NAME, verifyAuthToken, signAuthToken } from "@/lib/auth/token";
import { getDb } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/User";
import { toPublicUser } from "@/types/user";

async function getAuthCookieValue() {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

export async function getCurrentUser() {
  try {
    const token = await getAuthCookieValue();
    if (token) {
      const payload = verifyAuthToken(token);
      if (payload) {
        await getDb();
        const user = await UserModel.findById(payload.uid);
        if (user) return toPublicUser(user);
      }
    }
  } catch (err) {
    console.error('[getCurrentUser] Error:', err);
  }

  try {
    const session = await auth();
    if (!session?.user?.email) return null;
    await getDb();
    const user = await UserModel.findOne({ email: session.user.email.toLowerCase() });
    if (!user) return null;
    return toPublicUser(user);
  } catch (err) {
    console.error('[getCurrentUser] NextAuth fallback error:', err);
  }
  return null;
}

export async function verifyAuth(req: NextRequest): Promise<{ user: { id: string; email: string; role: "user" | "admin" } | null }> {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (token) {
      const payload = verifyAuthToken(token);
      if (payload) {
        await getDb();
        const user = await UserModel.findById(payload.uid);
        if (user) {
          return {
            user: {
              id: user._id.toString(),
              email: user.email,
              role: user.role || "user",
            },
          };
        }
      }
    }
  } catch (err) {
    console.error('[verifyAuth] Error:', err);
  }
  try {
    const session = await auth();
    if (!session?.user?.email) return { user: null };
    return {
      user: {
        id: session.user.id || "",
        email: session.user.email,
        role: session.user.role || "user",
      },
    };
  } catch (err) {
    console.error('[verifyAuth] NextAuth fallback error:', err);
  }
  return { user: null };
}

export async function setAuthCookie(userId: string) {
  const token = signAuthToken(userId);
  const store = await cookies();
  store.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
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
