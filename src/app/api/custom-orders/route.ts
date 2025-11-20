import { NextRequest, NextResponse } from "next/server";
export const runtime = 'nodejs';
import { getDb } from "@/lib/db/connection";
import { CustomOrderModel } from "@/lib/db/models/CustomOrder";
import { ProductModel } from "@/lib/db/models/Product";
import { verifyAuth } from "@/lib/auth/session";
import { z } from "zod";
import { ConsoleEmailService, sendCustomOrderCreated } from '@/lib/email/EmailService';
import { generateCustomOrderPreview } from '@/lib/preview/generateCustomOrderPreview';

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

// New builder schema supporting flattened design fields (still accept legacy structure for backward compatibility)
const CreateCustomOrderSchema = z.object({
  baseColor: z.enum(['white','black']),
  placement: z.enum(['front','back','chest_left','chest_right']),
  verticalPosition: z.enum(['upper','center','lower']),
  designType: z.enum(['text','image']),
  designText: z.string().optional().nullable(),
  designFont: z.string().optional().nullable(),
  designColor: z.string().optional().nullable(),
  designImageUrl: z.string().optional().nullable(),
  quantity: z.number().int().min(1).max(20).default(1),
  deliveryName: z.string().min(1),
  deliveryAddress: z.string().min(1),
  phoneNumber: z.string().min(1),
  notes: z.string().optional().nullable(),
}).or(z.object({
  // Legacy shape used earlier in UI
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
}));

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

    type LegacyShape = {
      baseShirt: { productId: string; color: string; size: string; quantity: number };
      placements: { placementKey: string; label: string }[];
      designAssets: Array<{
        placementKey: string; type: 'image' | 'text'; sourceType: 'uploaded' | 'template' | 'ai_generated'; imageUrl?: string; text?: string; font?: string; color?: string;
      }>;
      notes: string;
      delivery: { address: string; phone: string; email: string };
    };
    type NewShape = {
      baseColor: 'white' | 'black'; placement: 'front' | 'back' | 'chest_left' | 'chest_right'; verticalPosition: 'upper' | 'center' | 'lower';
      designType: 'text' | 'image'; designText?: string | null; designFont?: string | null; designColor?: string | null; designImageUrl?: string | null;
      quantity: number;
      deliveryName: string; deliveryAddress: string; phoneNumber: string; notes?: string | null;
    };
    const data: LegacyShape | NewShape = validationResult.data as (LegacyShape | NewShape);

    // Connect to database
    await getDb();

    // Detect builder (flattened) vs legacy shape
    const isBuilderShape = !('baseShirt' in data) && 'baseColor' in data && 'placement' in data && 'designType' in data;

    let basePrice: number;
    let quantity: number;
    let placementCount: number;
    if (isBuilderShape) {
      // Builder orders do NOT reference a Product document
      basePrice = MIN_BASE_PRICE; // flat base price for custom builder shirts
      quantity = (data as NewShape).quantity || 1;
      placementCount = 1; // single placement per builder submission currently
    } else {
      // Legacy path: attempt Product lookup
      const productId = (data as LegacyShape).baseShirt.productId;
      quantity = (data as LegacyShape).baseShirt.quantity;
      placementCount = (data as LegacyShape).placements.length;
      let productBasePrice = MIN_BASE_PRICE;
      try {
        const product = await ProductModel.findById(productId).lean();
        if (product && typeof product === 'object' && 'basePrice' in product) {
          // Narrow type safely without using 'any'
          const maybeBasePrice = (product as { basePrice?: unknown }).basePrice;
          if (typeof maybeBasePrice === 'number') {
            productBasePrice = maybeBasePrice;
          }
        }
      } catch {
        // Swallow lookup errors; fall back to MIN_BASE_PRICE
      }
      basePrice = productBasePrice;
    }

    // Compute pricing
    const pricing = computePricing(basePrice, placementCount, quantity);

    // Create custom order
    // Normalize to legacy storage shape for now while supporting new flattened inputs
    let baseShirt: LegacyShape['baseShirt'];
    let placements: LegacyShape['placements'];
    let designAssets: LegacyShape['designAssets'];
    let notes: string; let delivery: LegacyShape['delivery'];
    if (!isBuilderShape && 'baseShirt' in data) {
      baseShirt = data.baseShirt;
      placements = data.placements;
      designAssets = data.designAssets;
      notes = data.notes;
      delivery = data.delivery;
    } else {
      baseShirt = { productId: 'base-shirt-simple', color: data.baseColor, size: 'standard', quantity: (data as NewShape).quantity || 1 };
      placements = [{ placementKey: data.placement, label: data.placement.replace(/_/g,' ') }];
      designAssets = [];
      if (data.designType === 'text' && data.designText) {
        designAssets.push({ placementKey: data.placement, type: 'text', sourceType: 'uploaded', text: data.designText, font: data.designFont || undefined, color: data.designColor || undefined });
      } else if (data.designType === 'image' && data.designImageUrl) {
        designAssets.push({ placementKey: data.placement, type: 'image', sourceType: 'uploaded', imageUrl: data.designImageUrl });
      }
      notes = data.notes || '';
      delivery = { address: data.deliveryAddress, phone: data.phoneNumber, email: data.deliveryName + ' <no-reply@example.com>' };
    }

    const flattenedFields = 'baseShirt' in data ? {} : {
      baseColor: data.baseColor,
      placement: data.placement,
      verticalPosition: data.verticalPosition,
      designType: data.designType,
      designText: data.designType === 'text' ? data.designText || null : null,
      designFont: data.designType === 'text' ? data.designFont || null : null,
      designColor: data.designType === 'text' ? data.designColor || null : null,
      designImageUrl: data.designType === 'image' ? data.designImageUrl || null : null,
      quantity: (data as NewShape).quantity || 1,
      deliveryName: 'deliveryName' in data ? data.deliveryName : undefined,
      phoneNumber: 'phoneNumber' in data ? data.phoneNumber : undefined,
      priceEstimate: pricing.estimatedTotal,
    };

    const customOrder = await CustomOrderModel.create({
      userId: authResult.user.id,
      baseShirt,
      placements,
      designAssets,
      notes,
      delivery,
      pricing,
      status: 'PENDING_REVIEW',
      statusHistory: [{ status: 'PENDING_REVIEW', changedAt: new Date(), changedBy: authResult.user.id }],
      ...flattenedFields,
    });

    // Generate preview and persist URL if available
    try {
      const previewUrl = await generateCustomOrderPreview(customOrder);
      if (previewUrl) {
        await CustomOrderModel.findByIdAndUpdate(customOrder._id, { previewImageUrl: previewUrl });
      }
    } catch (e) {
      console.warn('Preview generation/update failed', e);
    }

    // Email notification (best-effort)
    try {
      const emailService = new ConsoleEmailService();
      await sendCustomOrderCreated(emailService, { email: delivery.email, order_id: customOrder._id.toString(), customer_name: delivery.email.split('@')[0] });
    } catch (e) {
      console.warn('Custom order email send failed', e);
    }

    // Re-fetch minimal fields to include preview url in response (best-effort)
    const latest = await CustomOrderModel.findById(customOrder._id).select('pricing previewImageUrl').lean();

    return NextResponse.json({
      success: true,
      orderId: customOrder._id.toString(),
      status: customOrder.status,
      estimatedTotal: pricing.estimatedTotal,
      previewImageUrl: latest?.previewImageUrl || null,
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
      baseColor: order.baseColor,
      placement: order.placement,
      verticalPosition: order.verticalPosition,
      designType: order.designType,
      designText: order.designText,
      designImageUrl: order.designImageUrl,
      quantity: order.quantity || order.baseShirt?.quantity || 1,
      previewImageUrl: order.previewImageUrl || null,
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
