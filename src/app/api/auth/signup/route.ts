import { NextResponse } from "next/server";

const message = {
  error: "Legacy endpoint removed. Use Auth.js via /api/auth/[...nextauth] or the /signup page.",
};

export async function POST() {
  return NextResponse.json(message, { status: 410 });
}
