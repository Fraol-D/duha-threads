import { NextResponse } from "next/server";
import { attachClearAuthCookie } from "@/lib/auth/session";

export async function POST() {
  const res = NextResponse.json({ status: "logged_out" });
  attachClearAuthCookie(res);
  return res;
}
