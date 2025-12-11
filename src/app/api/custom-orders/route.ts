import { NextRequest, NextResponse } from "next/server";
export const runtime = 'nodejs';
import { getDb } from "@/lib/db/connection";
import { CustomOrderModel } from "@/lib/db/models/CustomOrder";
import { ProductModel } from "@/lib/db/models/Product";
import { verifyAuth } from "@/lib/auth/session";
import { z } from "zod";
import { ConsoleEmailService, sendCustomOrderCreated } from '@/lib/email/EmailService';
import { generateCustomOrderPreview } from '@/lib/preview/generateCustomOrderPreview';
import { Types } from "mongoose";
import { generateOrderNumber, isOrderNumberDuplicateError } from '@/lib/orders/orderNumber';
import { validateCustomDesignDescription } from "@/lib/validation/customDesign";

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
  fontSize: z.number().min(12).max(120).optional(),
  textBoxWidth: z.enum(['narrow','standard','wide']).optional(),
  color: z.string().optional(),
  aiPrompt: z.string().optional(),
  templateId: z.string().optional(),
});

// Builder schemas (single-side & multi-side) plus legacy
const SideSchema = z.object({
  enabled: z.boolean(),
  placement: z.enum(['front','back']),
  verticalPosition: z.enum(['upper','center','lower']),
  designType: z.enum(['text','image']),
  designText: z.string().optional().nullable(),
  designFont: z.string().optional().nullable(),
  designFontSize: z.number().min(12).max(120).optional().nullable(),
  textBoxWidth: z.enum(['narrow','standard','wide']).optional().nullable(),
  designColor: z.string().optional().nullable(),
  designImageUrl: z.string().optional().nullable(),
});

const PlacementConfigSchema = z.object({
  id: z.string().min(1),
  area: z.enum(['front','back','left_chest','right_chest']),
  verticalPosition: z.enum(['upper','center','lower']),
  designType: z.enum(['text','image']),
  designText: z.string().optional().nullable(),
  designFont: z.string().optional().nullable(),
  designFontSize: z.number().min(12).max(120).optional().nullable(),
  textBoxWidth: z.enum(['narrow','standard','wide']).optional().nullable(),
  designColor: z.string().optional().nullable(),
  designImageUrl: z.string().optional().nullable(),
});

const MultiSideBuilderSchema = z.object({
  baseColor: z.enum(['white','black']),
  quantity: z.number().int().min(1).max(20).default(1),
  deliveryName: z.string().min(1),
  deliveryAddress: z.string().min(1),
  phoneNumber: z.string().min(1),
  notes: z.string().optional().nullable(),
  // new flexible multi-placement array
  placements: z.array(PlacementConfigSchema).min(1),
  // still accept sides for transitional compatibility
  sides: z.object({
    front: SideSchema.extend({ placement: z.literal('front') }),
    back: SideSchema.extend({ placement: z.literal('back') }),
  }).optional(),
});

// Side-only transitional builder (front/back) without new placements array
interface SideOnlyBuilder {
  baseColor: 'white' | 'black';
  quantity: number;
  deliveryName: string;
  deliveryAddress: string;
  phoneNumber: string;
  notes?: string | null;
  sides: {
    front: {
      enabled: boolean;
      placement: 'front';
      verticalPosition: 'upper' | 'center' | 'lower';
      designType: 'text' | 'image';
      designText?: string | null;
      designFont?: string | null;
      designColor?: string | null;
      designImageUrl?: string | null;
      designFontSize?: number | null;
      textBoxWidth?: 'narrow' | 'standard' | 'wide' | null;
    };
    back: {
      enabled: boolean;
      placement: 'back';
      verticalPosition: 'upper' | 'center' | 'lower';
      designType: 'text' | 'image';
      designText?: string | null;
      designFont?: string | null;
      designColor?: string | null;
      designImageUrl?: string | null;
      designFontSize?: number | null;
      textBoxWidth?: 'narrow' | 'standard' | 'wide' | null;
    };
  };
}

const SingleSideBuilderSchema = z.object({
  baseColor: z.enum(['white','black']),
  placement: z.enum(['front','back','chest_left','chest_right']),
  verticalPosition: z.enum(['upper','center','lower']),
  designType: z.enum(['text','image']),
  designText: z.string().optional().nullable(),
  designFont: z.string().optional().nullable(),
  designFontSize: z.number().min(12).max(120).optional().nullable(),
  textBoxWidth: z.enum(['narrow','standard','wide']).optional().nullable(),
  designColor: z.string().optional().nullable(),
  designImageUrl: z.string().optional().nullable(),
  quantity: z.number().int().min(1).max(20).default(1),
  deliveryName: z.string().min(1),
  deliveryAddress: z.string().min(1),
  phoneNumber: z.string().min(1),
  notes: z.string().optional().nullable(),
});

const LegacySchema = z.object({
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

const PublicSharingSchema = z.object({
  sharePublicly: z.boolean().optional(),
  showcaseTitle: z.string().min(3).max(80).optional().nullable(),
  showcaseDescription: z.string().max(500).optional().nullable(),
  showcaseProductSlug: z.string().min(1).optional().nullable(),
  showcaseProductId: z.string().optional().nullable(),
});

const BaseCustomOrderSchema = z.union([
  MultiSideBuilderSchema,
  SingleSideBuilderSchema,
  LegacySchema,
]);

const CreateCustomOrderSchema = BaseCustomOrderSchema.and(PublicSharingSchema);

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

    type LegacyShape = z.infer<typeof LegacySchema>;
    type SingleBuilderShape = z.infer<typeof SingleSideBuilderSchema>;
    type MultiBuilderShape = z.infer<typeof MultiSideBuilderSchema>;
    type SharingShape = z.infer<typeof PublicSharingSchema>;

    const shareFields = validationResult.data as SharingShape;
    const sharePublicly = Boolean(shareFields.sharePublicly);
    const showcaseTitle = shareFields.showcaseTitle?.trim() || null;
    const showcaseDescription = shareFields.showcaseDescription?.trim() || null;
    const showcaseSlug = shareFields.showcaseProductSlug?.trim() || null;
    const directProductId = shareFields.showcaseProductId?.trim() || null;

    const data = validationResult.data as LegacyShape | SingleBuilderShape | MultiBuilderShape;

    // Validate design content against content policy
    // Check multi-placement builder format
    if ('placements' in data && Array.isArray(data.placements)) {
      for (const placement of data.placements) {
        if ('designType' in placement && placement.designType === 'text' && placement.designText) {
          const contentValidation = validateCustomDesignDescription(placement.designText);
          if (!contentValidation.valid) {
            return NextResponse.json(
              { error: contentValidation.reason ?? "This custom design doesn't meet our guidelines." },
              { status: 400 }
            );
          }
        }
      }
    }
    // Check single-side builder format
    if ('designText' in data && data.designText) {
      const contentValidation = validateCustomDesignDescription(data.designText);
      if (!contentValidation.valid) {
        return NextResponse.json(
          { error: contentValidation.reason ?? "This custom design doesn't meet our guidelines." },
          { status: 400 }
        );
      }
    }
    // Check legacy format designAssets
    if ('designAssets' in data && Array.isArray(data.designAssets)) {
      for (const asset of data.designAssets) {
        if (asset.type === 'text' && asset.text) {
          const contentValidation = validateCustomDesignDescription(asset.text);
          if (!contentValidation.valid) {
            return NextResponse.json(
              { error: contentValidation.reason ?? "This custom design doesn't meet our guidelines." },
              { status: 400 }
            );
          }
        }
      }
    }

    // Connect to database
    await getDb();

    // Detect builder (flattened) vs legacy shape
    const isBuilderShape = !('baseShirt' in data) && 'baseColor' in data;
    const isMultiSide = isBuilderShape && 'sides' in data && !('placements' in data);
    const isMultiPlacement = isBuilderShape && 'placements' in data;

    let basePrice: number;
    let quantity: number;
    let placementCount: number;
    if (isBuilderShape) {
      basePrice = MIN_BASE_PRICE;
      const builder = data as (SingleBuilderShape | MultiBuilderShape);
      // Builder union both have quantity
      quantity = (builder as SingleBuilderShape).quantity || (builder as MultiBuilderShape).quantity || 1;
      if (isMultiPlacement) {
        placementCount = (builder as MultiBuilderShape).placements.length;
      } else if (isMultiSide) {
        const sidesData = (builder as MultiBuilderShape).sides;
        placementCount = sidesData ? [sidesData.front, sidesData.back].filter(s => s.enabled).length || 1 : 1;
      } else {
        placementCount = 1;
      }
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

    // Resolve linked product for public showcase (best-effort)
    let linkedProductId: Types.ObjectId | null = null;
    if (sharePublicly) {
      if (directProductId && Types.ObjectId.isValid(directProductId)) {
        linkedProductId = new Types.ObjectId(directProductId);
      } else if (showcaseSlug) {
        const linkedProduct = await ProductModel.findOne({ slug: showcaseSlug })
          .select('_id')
          .lean<{ _id: Types.ObjectId }>();
        if (linkedProduct?._id) {
          linkedProductId = linkedProduct._id;
        }
      }
    }

    // Create custom order
    // Normalize to legacy storage shape for now while supporting new flattened inputs
    let baseShirt: LegacyShape['baseShirt'];
    let legacyPlacements: LegacyShape['placements'];
    let newPlacements: MultiBuilderShape['placements'] | undefined;
    let designAssets: LegacyShape['designAssets'];
    let notes: string; let delivery: LegacyShape['delivery'];
    if (!isBuilderShape && 'baseShirt' in data) {
      baseShirt = data.baseShirt;
      // legacy placements
      legacyPlacements = (data as LegacyShape).placements;
      designAssets = data.designAssets;
      notes = data.notes;
      delivery = data.delivery;
    } else if (isMultiPlacement) {
      const multi = data as MultiBuilderShape;
      baseShirt = { productId: 'base-shirt-simple', color: multi.baseColor, size: 'standard', quantity: multi.quantity || 1 };
      // Build legacyPlacements from new placements for preview/backward compatibility
      legacyPlacements = multi.placements.map(p => ({ placementKey: p.area === 'left_chest' ? 'chest_left' : p.area === 'right_chest' ? 'chest_right' : p.area, label: p.area.replace(/_/g,' ') }));
      newPlacements = multi.placements;
      designAssets = multi.placements.map(p => {
        if (p.designType === 'text') {
          return {
            placementKey: p.area === 'left_chest' ? 'chest_left' : p.area === 'right_chest' ? 'chest_right' : p.area,
            type: 'text',
            sourceType: 'uploaded',
            text: p.designText || undefined,
            font: p.designFont || undefined,
            fontSize: p.designFontSize || undefined,
            textBoxWidth: p.textBoxWidth || undefined,
            color: p.designColor || undefined,
          };
        }
        return { placementKey: p.area === 'left_chest' ? 'chest_left' : p.area === 'right_chest' ? 'chest_right' : p.area, type: 'image', sourceType: 'uploaded', imageUrl: p.designImageUrl || undefined };
      });
      notes = multi.notes || '';
      delivery = { address: multi.deliveryAddress, phone: multi.phoneNumber, email: multi.deliveryName + ' <no-reply@example.com>' };
    } else if (isMultiSide) {
      const multi = data as SideOnlyBuilder;
      baseShirt = { productId: 'base-shirt-simple', color: multi.baseColor, size: 'standard', quantity: multi.quantity || 1 };
      legacyPlacements = [];
      designAssets = [];
      if (multi.sides && multi.sides.front.enabled) {
        legacyPlacements.push({ placementKey: 'front', label: 'front' });
        if (multi.sides.front.designType === 'text' && multi.sides.front.designText) {
            designAssets.push({
              placementKey: 'front',
              type: 'text',
              sourceType: 'uploaded',
              text: multi.sides.front.designText,
              font: multi.sides.front.designFont || undefined,
              fontSize: multi.sides.front.designFontSize || undefined,
              textBoxWidth: multi.sides.front.textBoxWidth || undefined,
              color: multi.sides.front.designColor || undefined,
            });
        } else if (multi.sides.front.designType === 'image' && multi.sides.front.designImageUrl) {
          designAssets.push({ placementKey: 'front', type: 'image', sourceType: 'uploaded', imageUrl: multi.sides.front.designImageUrl });
        }
      }
      if (multi.sides && multi.sides.back.enabled) {
        legacyPlacements.push({ placementKey: 'back', label: 'back' });
        if (multi.sides.back.designType === 'text' && multi.sides.back.designText) {
            designAssets.push({
              placementKey: 'back',
              type: 'text',
              sourceType: 'uploaded',
              text: multi.sides.back.designText,
              font: multi.sides.back.designFont || undefined,
              fontSize: multi.sides.back.designFontSize || undefined,
              textBoxWidth: multi.sides.back.textBoxWidth || undefined,
              color: multi.sides.back.designColor || undefined,
            });
        } else if (multi.sides.back.designType === 'image' && multi.sides.back.designImageUrl) {
          designAssets.push({ placementKey: 'back', type: 'image', sourceType: 'uploaded', imageUrl: multi.sides.back.designImageUrl });
        }
      }
      notes = multi.notes || '';
      delivery = { address: multi.deliveryAddress, phone: multi.phoneNumber, email: multi.deliveryName + ' <no-reply@example.com>' };
    } else {
      const single = data as SingleBuilderShape;
      baseShirt = { productId: 'base-shirt-simple', color: single.baseColor, size: 'standard', quantity: single.quantity || 1 };
      legacyPlacements = [{ placementKey: single.placement, label: single.placement.replace(/_/g,' ') }];
      designAssets = [];
      if (single.designType === 'text' && single.designText) {
        designAssets.push({
          placementKey: single.placement,
          type: 'text',
          sourceType: 'uploaded',
          text: single.designText,
          font: single.designFont || undefined,
          fontSize: single.designFontSize || undefined,
          textBoxWidth: single.textBoxWidth || undefined,
          color: single.designColor || undefined,
        });
      } else if (single.designType === 'image' && single.designImageUrl) {
        designAssets.push({ placementKey: single.placement, type: 'image', sourceType: 'uploaded', imageUrl: single.designImageUrl });
      }
      notes = single.notes || '';
      delivery = { address: single.deliveryAddress, phone: single.phoneNumber, email: single.deliveryName + ' <no-reply@example.com>' };
    }

    let flattenedFields: Record<string, unknown> = {};
    if (!('baseShirt' in data)) {
      if (isMultiPlacement) {
        const multi = data as MultiBuilderShape;
        // Choose primary placement for legacy flattened fields preference: first front else first
        const primary = multi.placements.find(p => p.area === 'front') || multi.placements[0];
        flattenedFields = {
          baseColor: multi.baseColor,
          placement: primary ? (primary.area === 'left_chest' ? 'chest_left' : primary.area === 'right_chest' ? 'chest_right' : primary.area) : undefined,
          verticalPosition: primary?.verticalPosition,
          designType: primary?.designType,
          designText: primary?.designType === 'text' ? primary.designText || null : null,
          designFont: primary?.designType === 'text' ? primary.designFont || null : null,
          designFontSize: primary?.designType === 'text' ? primary.designFontSize || null : null,
          textBoxWidth: primary?.designType === 'text' ? primary.textBoxWidth || null : null,
          designColor: primary?.designType === 'text' ? primary.designColor || null : null,
          designImageUrl: primary?.designType === 'image' ? primary.designImageUrl || null : null,
          quantity: multi.quantity || 1,
          deliveryName: multi.deliveryName,
          phoneNumber: multi.phoneNumber,
          priceEstimate: pricing.estimatedTotal,
          placements: multi.placements,
        };
      } else if (isMultiSide) {
        const multi = data as SideOnlyBuilder;
        const primary = multi.sides ? (multi.sides.front.enabled ? multi.sides.front : multi.sides.back) : undefined;
        flattenedFields = {
          baseColor: multi.baseColor,
          placement: primary?.placement,
          verticalPosition: primary?.verticalPosition,
          designType: primary?.designType,
          designText: primary?.designType === 'text' ? primary?.designText || null : null,
          designFont: primary?.designType === 'text' ? primary?.designFont || null : null,
          designFontSize: primary?.designType === 'text' ? primary?.designFontSize || null : null,
          textBoxWidth: primary?.designType === 'text' ? primary?.textBoxWidth || null : null,
          designColor: primary?.designType === 'text' ? primary?.designColor || null : null,
          designImageUrl: primary?.designType === 'image' ? primary?.designImageUrl || null : null,
          quantity: multi.quantity || 1,
          deliveryName: multi.deliveryName,
          phoneNumber: multi.phoneNumber,
          priceEstimate: pricing.estimatedTotal,
          sides: multi.sides,
        };
      } else {
        const single = data as SingleBuilderShape;
        flattenedFields = {
          baseColor: single.baseColor,
          placement: single.placement,
          verticalPosition: single.verticalPosition,
          designType: single.designType,
          designText: single.designType === 'text' ? single.designText || null : null,
          designFont: single.designType === 'text' ? single.designFont || null : null,
          designFontSize: single.designType === 'text' ? single.designFontSize || null : null,
          textBoxWidth: single.designType === 'text' ? single.textBoxWidth || null : null,
          designColor: single.designType === 'text' ? single.designColor || null : null,
          designImageUrl: single.designType === 'image' ? single.designImageUrl || null : null,
          quantity: single.quantity || 1,
          deliveryName: single.deliveryName,
          phoneNumber: single.phoneNumber,
          priceEstimate: pricing.estimatedTotal,
        };
      }
    }

    const customOrderBase = {
      userId: authResult.user.id,
      baseShirt,
      legacyPlacements,
      placements: newPlacements,
      designAssets,
      notes,
      delivery,
      pricing,
      status: 'PENDING_REVIEW',
      statusHistory: [{ status: 'PENDING_REVIEW', changedAt: new Date(), changedBy: authResult.user.id }],
      ...flattenedFields,
      isPublic: sharePublicly,
      publicStatus: sharePublicly ? 'pending' : 'private',
      publicTitle: showcaseTitle,
      publicDescription: showcaseDescription,
      linkedProductId,
    };

    const today = new Date();
    let customOrder = null;
    for (let seq = 0; seq < 10; seq++) {
      try {
        const candidate = generateOrderNumber(today, seq);
        customOrder = await CustomOrderModel.create({ ...customOrderBase, orderNumber: candidate });
        break;
      } catch (err) {
        if (isOrderNumberDuplicateError(err)) {
          continue;
        }
        throw err;
      }
    }

    if (!customOrder) {
      return NextResponse.json({ error: 'Unable to generate unique custom order number' }, { status: 500 });
    }

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
      orderNumber: customOrder.orderNumber,
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

    const orders = customOrders.map((order) => {
      const placements = Array.isArray(order.placements) ? order.placements : [];
      const legacyAreas = Array.isArray(order.legacyPlacements) ? order.legacyPlacements.map(p=>p.placementKey) : [];
      const areas = placements.length > 0 ? placements.map(p=> p.area === 'left_chest' ? 'left_chest' : p.area === 'right_chest' ? 'right_chest' : p.area ) : legacyAreas;
      return {
        id: order._id.toString(),
        orderNumber: order.orderNumber || order._id.toString().slice(-6),
        status: order.status,
        baseColor: order.baseColor,
        baseShirt: order.baseShirt,
        placement: order.placement, // legacy primary
        verticalPosition: order.verticalPosition,
        designType: order.designType,
        designText: order.designText,
        designFont: order.designFont,
        designFontSize: order.designFontSize,
        textBoxWidth: order.textBoxWidth,
        designColor: order.designColor,
        designImageUrl: order.designImageUrl,
        quantity: order.quantity || order.baseShirt?.quantity || 1,
        previewImageUrl: order.previewImageUrl || null,
        createdAt: order.createdAt,
        placements, // full placement configs
        legacyPlacements: order.legacyPlacements || [],
        designAssets: order.designAssets || [],
        sides: order.sides,
        areas, // simplified area summary
      };
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Fetch custom orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom orders" },
      { status: 500 }
    );
  }
}
