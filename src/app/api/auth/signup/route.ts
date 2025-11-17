import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/User";
import { hashPassword } from "@/lib/auth/password";
import { setAuthCookie } from "@/lib/auth/session";
import { toPublicUser } from "@/types/user";

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  defaultAddress: z.string().optional(),
  marketingEmailOptIn: z.boolean().optional().default(false),
  marketingSmsOptIn: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  await getDb();
  const existing = await UserModel.findOne({ email: data.email });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }
  const hashed = await hashPassword(data.password);
  const user = await UserModel.create({
    name: data.name,
    email: data.email.toLowerCase(),
    hashedPassword: hashed,
    phone: data.phone,
    defaultAddress: data.defaultAddress,
    marketingEmailOptIn: data.marketingEmailOptIn,
    marketingSmsOptIn: data.marketingSmsOptIn,
  });
  setAuthCookie(user._id.toString());
  return NextResponse.json({ user: toPublicUser(user as any) }, { status: 201 });
}
