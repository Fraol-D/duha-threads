import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { CustomOrderModel } from "@/lib/db/models/CustomOrder";
import { verifyAuth } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { ConsoleEmailService, sendCustomOrderStatusChanged } from "@/lib/email/EmailService";
import { z } from "zod";


const UpdateCustomOrderSchema = z.object({
  status: z.enum([
    "PENDING_REVIEW",
    "ACCEPTED",
    "IN_DESIGN",
    "IN_PRINTING",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
  ]).optional(),
  finalTotal: z.number().optional(),
  adminNotes: z.string().optional(),
  adminNote: z.string().optional(),
  addStatusHistory: z.boolean().optional().default(true),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.user || !isAdmin(authResult.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await getDb();

    const customOrder = await CustomOrderModel.findById(id).lean();

    if (!customOrder) {
      return NextResponse.json({ error: "Custom order not found" }, { status: 404 });
    }

    const order = {
      id: customOrder._id.toString(),
      userId: customOrder.userId?.toString() || null,
      baseShirt: customOrder.baseShirt,
      // Flattened builder fields (optional)
      baseColor: customOrder.baseColor,
      placement: customOrder.placement,
      verticalPosition: customOrder.verticalPosition,
      designType: customOrder.designType,
      designText: customOrder.designText,
      designFont: customOrder.designFont,
      designColor: customOrder.designColor,
      designImageUrl: customOrder.designImageUrl,
      previewImageUrl: customOrder.previewImageUrl,
      quantity: customOrder.quantity || customOrder.baseShirt?.quantity || 1,
      placements: customOrder.placements,
      designAssets: customOrder.designAssets,
      notes: customOrder.notes,
      delivery: customOrder.delivery,
      pricing: customOrder.pricing,
      status: customOrder.status,
      statusHistory: customOrder.statusHistory,
      createdAt: customOrder.createdAt,
      updatedAt: customOrder.updatedAt,
    };

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Admin fetch custom order error:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.user || !isAdmin(authResult.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validationResult = UpdateCustomOrderSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    await getDb();

    const customOrder = await CustomOrderModel.findById(id);
    if (!customOrder) {
      return NextResponse.json({ error: "Custom order not found" }, { status: 404 });
    }

    // Update status if provided
    if (data.status && data.status !== customOrder.status) {
      customOrder.status = data.status;
      
      if (data.addStatusHistory) {
        customOrder.statusHistory.push({
          status: data.status,
          changedAt: new Date(),
          changedBy: authResult.user.email,
        });
      }
    }

    // Update final total if provided
    if (data.finalTotal !== undefined) {
      customOrder.pricing.finalTotal = data.finalTotal;
    }

    // Admin notes can be appended to the notes field
    const noteToAppend = data.adminNotes || data.adminNote;
    if (noteToAppend) {
      customOrder.notes = customOrder.notes
        ? `${customOrder.notes}\n\nAdmin Note: ${noteToAppend}`
        : `Admin Note: ${noteToAppend}`;
    }

    await customOrder.save();

    // Send status change email (best-effort)
    if (data.status) {
      try {
        const emailService = new ConsoleEmailService();
        await sendCustomOrderStatusChanged(emailService, { email: customOrder.delivery.email, order_id: customOrder._id.toString(), status: customOrder.status });
      } catch (e) {
        console.warn("Admin status email failed", e);
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: customOrder._id.toString(),
        status: customOrder.status,
        pricing: customOrder.pricing,
        statusHistory: customOrder.statusHistory,
      },
    });
  } catch (error) {
    console.error("Admin update custom order error:", error);
    return NextResponse.json(
      { error: "Failed to update custom order" },
      { status: 500 }
    );
  }
}
