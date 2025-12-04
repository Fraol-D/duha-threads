import { NextResponse } from "next/server";

const message = {
  error: "Legacy endpoint removed. Call signOut() from next-auth instead of POST /api/auth/logout.",
};

export async function POST() {
  return NextResponse.json(message, { status: 410 });
}
