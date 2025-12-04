import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/User";
import { toPublicUser } from "@/types/user";

export async function getCurrentUser() {
  try {
    const session = await auth();
    if (!session?.user?.email) return null;

    await getDb();
    const lookupId = session.user.id;
    const user = lookupId
      ? await UserModel.findById(lookupId)
      : await UserModel.findOne({ email: session.user.email.toLowerCase() });
    if (!user) return null;
    return toPublicUser(user);
  } catch (err) {
    console.error('[getCurrentUser] Error:', err);
    return null;
  }
}

export async function verifyAuth(req?: NextRequest): Promise<{ user: { id: string; email: string; role: "user" | "admin"; twoFactorEnabled?: boolean; twoFactorVerifiedAt?: string | null } | null }> {
  try {
    const session = req ? await auth(req) : await auth();
    if (!session?.user?.email) return { user: null };

    await getDb();
    const lookupId = session.user.id;
    const user = lookupId
      ? await UserModel.findById(lookupId)
      : await UserModel.findOne({ email: session.user.email.toLowerCase() });
    if (!user) return { user: null };

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role || "user",
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorVerifiedAt: user.twoFactorVerifiedAt ? user.twoFactorVerifiedAt.toISOString() : null,
      },
    };
  } catch (err) {
    console.error('[verifyAuth] Error:', err);
    return { user: null };
  }
}

