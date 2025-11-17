import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/connection";
import { OrderModel, type OrderStatus } from "@/lib/db/models/Order";
import { env } from "@/config/env";
import { ConsoleEmailService, buildOrderEmail } from "@/lib/email/EmailService";

const patchSchema = z.object({ status: z.enum(["Pending","Accepted","In Printing","Out for Delivery","Delivered","Cancelled"]) });

function isAdmin(user: { email: string }) {
  const allow = env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean) || [];
  return allow.includes((user.email || "").toLowerCase());
}

export async function GET(_req: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!env.MONGODB_URI || !env.MONGODB_URI.startsWith("mongodb")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await getDb();
  const order = await OrderModel.findOne({ _id: orderId, userId: user.id }).lean();
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  if (!env.MONGODB_URI || !env.MONGODB_URI.startsWith("mongodb")) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }
  await getDb();
  const order = await OrderModel.findByIdAndUpdate(orderId, { $set: { status: parsed.data.status } }, { new: true }).lean();
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  type OrderLean = {
    _id: { toString(): string } | string;
    email: string;
    deliveryAddress: string;
    status: OrderStatus;
  };
  const ord = order as unknown as OrderLean;

  // Trigger emails for certain transitions
  const mailer = new ConsoleEmailService();
  const evtMap: Record<OrderStatus, "order_accepted" | "order_out_for_delivery" | "order_delivered" | null> = {
    Pending: null,
    Accepted: "order_accepted",
    "In Printing": null,
    "Out for Delivery": "order_out_for_delivery",
    Delivered: "order_delivered",
    Cancelled: null,
  };
  const evt = evtMap[ord.status as OrderStatus];
  if (evt) {
    const mail = buildOrderEmail(evt, {
      email: ord.email,
      order_id: (typeof ord._id === "string" ? ord._id : ord._id.toString()),
      delivery_address: ord.deliveryAddress,
    });
    await mailer.send(mail);
  }

  return NextResponse.json({ order });
}
