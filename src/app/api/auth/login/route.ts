import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/User";
import type { UserDocument } from "@/types/user";
import { verifyPassword } from "@/lib/auth/password";
import { attachAuthCookie } from "@/lib/auth/session";
import { toPublicUser } from "@/types/user";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(json);
    if (!parsed.success) {
      console.error("Login failed: Invalid input", parsed.error.flatten());
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { email, password } = parsed.data;
    await getDb();
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error(`Login failed: No user found for email: ${email.toLowerCase()}`);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const ok = await verifyPassword(password, user.hashedPassword);
    if (!ok) {
      console.error(`Login failed: Password mismatch for email: ${email.toLowerCase()}`);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const doc = user.toObject() as UserDocument;
    const res = NextResponse.json({ user: toPublicUser(doc) });
    attachAuthCookie(res, user._id.toString());
    return res;
  } catch (err) {
    console.error("Login API error:", err);
    return NextResponse.json({ error: "Internal server error", details: String(err) }, { status: 500 });
  }
}
