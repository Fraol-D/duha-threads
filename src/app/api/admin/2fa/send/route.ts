import { NextRequest, NextResponse } from "next/server";
import { randomInt, createHash } from "crypto";
import { verifyAuth } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/User";
import { sendMail } from "@/lib/email/mailer";

const CODE_EXPIRY_MINUTES = 10;

function generateCode() {
  return String(randomInt(100000, 1000000));
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.user || auth.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await getDb();
    const user = await UserModel.findById(auth.user.id);
    if (!user) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    if (!user.twoFactorEnabled) {
      return NextResponse.json({ error: "Two-factor authentication is not enabled." }, { status: 400 });
    }

    const code = generateCode();
    user.twoFactorCode = createHash("sha256").update(code).digest("hex");
    user.twoFactorExpiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);
    await user.save();

    await sendMail({
      to: user.email,
      subject: "Your Duha Threads admin verification code",
      text: `Your verification code is ${code}. It expires in ${CODE_EXPIRY_MINUTES} minutes. If you did not request this, please contact support immediately.`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[ADMIN_2FA_SEND]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
