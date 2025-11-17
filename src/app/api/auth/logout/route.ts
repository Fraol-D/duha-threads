import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth/session";

export async function POST() {
  clearAuthCookie();
  return NextResponse.json({ status: "logged_out" });
}
