import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { CustomOrderModel } from "@/lib/db/models/CustomOrder";
import { ProductModel } from "@/lib/db/models/Product";
import { verifyAuth } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/admin";
import { ConsoleEmailService, sendCustomOrderStatusChanged } from "@/lib/email/EmailService";
import { z } from "zod";
import { Types } from "mongoose";


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
  publicStatus: z.enum(['private','pending','approved','rejected']).optional(),
  publicTitle: z.string().max(80).optional().nullable(),
  publicDescription: z.string().max(500).optional().nullable(),
  linkedProductReference: z.string().optional().nullable(),
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
      orderNumber: customOrder.orderNumber || customOrder._id.toString().slice(-6),
      userId: customOrder.userId?.toString() || null,
      baseShirt: customOrder.baseShirt,
      // Flattened builder fields (optional)
      baseColor: customOrder.baseColor,
      placement: customOrder.placement,
      verticalPosition: customOrder.verticalPosition,
      designType: customOrder.designType,
      designText: customOrder.designText,
      designFont: customOrder.designFont,
      designFontSize: customOrder.designFontSize,
      textBoxWidth: customOrder.textBoxWidth,
      designColor: customOrder.designColor,
      designImageUrl: customOrder.designImageUrl,
      previewImageUrl: customOrder.previewImageUrl,
      quantity: customOrder.quantity || customOrder.baseShirt?.quantity || 1,
      legacyPlacements: customOrder.legacyPlacements,
      sides: customOrder.sides,
      placements: customOrder.placements,
      designAssets: customOrder.designAssets,
      notes: customOrder.notes,
      delivery: customOrder.delivery,
      isPublic: customOrder.isPublic,
      publicStatus: customOrder.publicStatus,
      publicTitle: customOrder.publicTitle,
      publicDescription: customOrder.publicDescription,
      linkedProductId: customOrder.linkedProductId ? customOrder.linkedProductId.toString() : null,
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

    if (data.publicStatus && data.publicStatus !== customOrder.publicStatus) {
      customOrder.publicStatus = data.publicStatus;
      customOrder.isPublic = data.publicStatus === 'approved';
      if (data.publicStatus === 'private') {
        customOrder.linkedProductId = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(data, 'publicTitle')) {
      customOrder.publicTitle = data.publicTitle || null;
    }

    if (Object.prototype.hasOwnProperty.call(data, 'publicDescription')) {
      customOrder.publicDescription = data.publicDescription || null;
    }

    if (Object.prototype.hasOwnProperty.call(data, 'linkedProductReference')) {
      const ref = data.linkedProductReference?.trim();
      if (!ref) {
        customOrder.linkedProductId = null;
      } else if (Types.ObjectId.isValid(ref)) {
        customOrder.linkedProductId = new Types.ObjectId(ref);
      } else {
        const linkedProduct = await ProductModel.findOne({ slug: ref })
          .select('_id')
          .lean<{ _id: Types.ObjectId }>();
        if (!linkedProduct) {
          return NextResponse.json({ error: "Linked product not found" }, { status: 400 });
        }
        customOrder.linkedProductId = linkedProduct._id;
      }
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
        orderNumber: customOrder.orderNumber || customOrder._id.toString().slice(-6),
        status: customOrder.status,
        pricing: customOrder.pricing,
        statusHistory: customOrder.statusHistory,
        publicStatus: customOrder.publicStatus,
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
