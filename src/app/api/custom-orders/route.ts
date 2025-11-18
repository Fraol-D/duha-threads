import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/connection";
import { CustomOrderModel } from "@/lib/db/models/CustomOrder";
import { ProductModel } from "@/lib/db/models/Product";
import { verifyAuth } from "@/lib/auth/session";
import { z } from "zod";

const PlacementSchema = z.object({
  placementKey: z.string().min(1),
  label: z.string().min(1),
});

const DesignAssetSchema = z.object({
  placementKey: z.string().min(1),
  type: z.enum(["image", "text"]),
  sourceType: z.enum(["uploaded", "template", "ai_generated"]),
  imageUrl: z.string().optional(),
  text: z.string().optional(),
  font: z.string().optional(),
  color: z.string().optional(),
  aiPrompt: z.string().optional(),
  templateId: z.string().optional(),
});

const CreateCustomOrderSchema = z.object({
  baseShirt: z.object({
    productId: z.string().min(1),
    color: z.string().min(1),
    size: z.string().min(1),
    quantity: z.number().int().min(1),
  }),
  placements: z.array(PlacementSchema).min(1),
  designAssets: z.array(DesignAssetSchema).min(0),
  notes: z.string().optional().default(""),
  delivery: z.object({
    address: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
  }),
});

// Pricing rules
const BASE_PLACEMENT_COST = 15; // $15 per placement
const MIN_BASE_PRICE = 20; // Default if product not found

function computePricing(
  basePrice: number,
  placementCount: number,
  quantity: number
): { basePrice: number; placementCost: number; quantityMultiplier: number; estimatedTotal: number } {
  const placementCost = placementCount * BASE_PLACEMENT_COST;
  const quantityMultiplier = quantity;
  const estimatedTotal = (basePrice + placementCost) * quantityMultiplier;
  
  return {
    basePrice,
    placementCost,
    quantityMultiplier,
    estimatedTotal,
  };
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validationResult = CreateCustomOrderSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Connect to database
    await getDb();

    // Validate product exists and is active
    const product = await ProductModel.findById(data.baseShirt.productId).lean();

    const basePrice = (product && typeof product === 'object' && 'basePrice' in product) 
      ? (product.basePrice as number) 
      : MIN_BASE_PRICE;
    
    // Compute pricing
    const pricing = computePricing(
      basePrice,
      data.placements.length,
      data.baseShirt.quantity
    );

    // Create custom order
    const customOrder = await CustomOrderModel.create({
      userId: authResult.user.id,
      baseShirt: data.baseShirt,
      placements: data.placements,
      designAssets: data.designAssets,
      notes: data.notes,
      delivery: data.delivery,
      pricing,
      status: "PENDING_REVIEW",
      statusHistory: [
        {
          status: "PENDING_REVIEW",
          changedAt: new Date(),
          changedBy: authResult.user.id,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      customOrderId: customOrder._id.toString(),
      estimatedTotal: pricing.estimatedTotal,
    });
  } catch (error) {
    console.error("Custom order creation error:", error);
    return NextResponse.json(
      { error: "Failed to create custom order" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await getDb();

    const customOrders = await CustomOrderModel.find({ userId: authResult.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const orders = customOrders.map((order) => ({
      id: order._id.toString(),
      status: order.status,
      baseShirt: order.baseShirt,
      placements: order.placements,
      estimatedTotal: order.pricing.estimatedTotal,
      finalTotal: order.pricing.finalTotal,
      createdAt: order.createdAt,
    }));

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Fetch custom orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom orders" },
      { status: 500 }
    );
  }
}
