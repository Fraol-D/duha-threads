import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { CustomOrderModel } from "@/lib/db/models/CustomOrder";
import { verifyAuth } from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await getDb();

    const customOrder = await CustomOrderModel.findOne({
      _id: id,
      userId: authResult.user.id,
    }).lean();

    if (!customOrder) {
      return NextResponse.json({ error: "Custom order not found" }, { status: 404 });
    }

    const order = {
      id: customOrder._id.toString(),
      // Flattened builder fields (if present)
      baseColor: customOrder.baseColor,
      placement: customOrder.placement,
      verticalPosition: customOrder.verticalPosition,
      designType: customOrder.designType,
      designText: customOrder.designText,
      designFont: customOrder.designFont,
      designColor: customOrder.designColor,
      designImageUrl: customOrder.designImageUrl,
      quantity: customOrder.quantity || customOrder.baseShirt?.quantity || 1,
      previewImageUrl: customOrder.previewImageUrl || null,
      // Legacy/structured fields
      baseShirt: customOrder.baseShirt,
      legacyPlacements: customOrder.legacyPlacements,
      sides: customOrder.sides,
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
    console.error("Fetch custom order error:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom order" },
      { status: 500 }
    );
  }
}
