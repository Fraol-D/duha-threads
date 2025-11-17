import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { OrderModel } from "@/lib/db/models/Order";
import { env } from "@/config/env";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!env.MONGODB_URI || !env.MONGODB_URI.startsWith("mongodb")) {
    return NextResponse.json({ orders: [] });
  }
  await getDb();
  const orders = await OrderModel.find({ userId: user.id }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ orders });
}
