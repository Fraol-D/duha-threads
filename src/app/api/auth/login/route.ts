import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/User";
import { verifyPassword } from "@/lib/auth/password";
import { setAuthCookie } from "@/lib/auth/session";
import { toPublicUser } from "@/types/user";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { email, password } = parsed.data;
  await getDb();
  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const ok = await verifyPassword(password, user.hashedPassword);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  setAuthCookie(user._id.toString());
  return NextResponse.json({ user: toPublicUser(user) });
}
