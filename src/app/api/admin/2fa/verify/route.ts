import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { verifyAuth } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/User";

const verifySchema = z.object({
  code: z.string().trim().min(6).max(6),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.user || auth.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    await getDb();
    const user = await UserModel.findById(auth.user.id);
    if (!user || !user.twoFactorEnabled) {
      return NextResponse.json({ error: "Two-factor authentication is not enabled." }, { status: 400 });
    }

    if (!user.twoFactorCode || !user.twoFactorExpiresAt) {
      return NextResponse.json({ error: "No active verification code." }, { status: 400 });
    }

    if (user.twoFactorExpiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Verification code expired." }, { status: 400 });
    }

    const hashedInput = createHash("sha256").update(parsed.data.code).digest("hex");
    if (hashedInput !== user.twoFactorCode) {
      return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
    }

    user.twoFactorCode = null;
    user.twoFactorExpiresAt = null;
    user.twoFactorVerifiedAt = new Date();
    await user.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[ADMIN_2FA_VERIFY]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
