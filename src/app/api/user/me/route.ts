import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/User";
import { toPublicUser } from "@/types/user";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  defaultAddress: z.string().optional(),
  marketingEmailOptIn: z.boolean().optional(),
  marketingSmsOptIn: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ user });
  } catch (err) {
    console.error('[/api/user/me] GET error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const current = await getCurrentUser();
    if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    await getDb();
    const update = parsed.data;
    const doc = await UserModel.findByIdAndUpdate(current.id, update, { new: true });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ user: toPublicUser(doc as any) });
  } catch (err) {
    console.error('[/api/user/me] PATCH error:', err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
