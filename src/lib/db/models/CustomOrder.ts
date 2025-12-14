import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILegacyPlacement {
  placementKey: string;
  label: string;
}

export interface INewPlacementConfig {
  id: string; // e.g. front-1, back-1
  area: 'front' | 'back' | 'left_chest' | 'right_chest';
  verticalPosition: 'upper' | 'center' | 'lower';
  designType: 'text' | 'image';
  designText?: string | null;
  designFont?: string | null;
  designFontSize?: number | null;
  textBoxWidth?: 'narrow' | 'standard' | 'wide' | null;
  designColor?: string | null;
  designImageUrl?: string | null;
}

export interface IDesignAsset {
  placementKey: string;
  type: "image" | "text";
  sourceType: "uploaded" | "template" | "ai_generated";
  imageUrl?: string;
  text?: string;
  font?: string;
  fontSize?: number;
  textBoxWidth?: 'narrow' | 'standard' | 'wide';
  color?: string;
  aiPrompt?: string;
  templateId?: string;
}

export interface IDelivery {
  address: string;
  phone: string;
  email: string;
}

export interface IPricing {
  basePrice: number;
  placementCost: number;
  quantityMultiplier: number;
  estimatedTotal: number;
  finalTotal?: number;
}

export interface IStatusHistoryEntry {
  status: string;
  changedAt: Date;
  changedBy: string;
}

export type CustomOrderStatus =
  | 'PENDING_REVIEW'
  | 'ACCEPTED' // legacy
  | 'APPROVED' // new preferred label replacing ACCEPTED
  | 'IN_DESIGN'
  | 'IN_PRINTING'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface CustomOrderDocument extends Document {
  orderNumber?: string;
  userId: mongoose.Types.ObjectId | null;
  baseShirt: {
    productId: string;
    color: string;
    size: string;
    quantity: number;
  };
  // Unified quantity field (builder-specific; legacy still uses baseShirt.quantity)
  quantity?: number;
  // Flattened builder fields (optional for legacy orders)
  baseColor?: 'white' | 'black';
  placement?: 'front' | 'back' | 'chest_left' | 'chest_right';
  verticalPosition?: 'upper' | 'center' | 'lower';
  designType?: 'text' | 'image';
  designText?: string | null;
  designFont?: string | null;
  designFontSize?: number | null;
  textBoxWidth?: 'narrow' | 'standard' | 'wide' | null;
  designColor?: string | null;
  designImageUrl?: string | null;
  previewImageUrl?: string | null;
  isPublic?: boolean;
  publicStatus?: 'private' | 'pending' | 'approved' | 'rejected';
  publicTitle?: string | null;
  publicDescription?: string | null;
  linkedProductId?: mongoose.Types.ObjectId | null;
  // Multi-side (front/back) design support
  sides?: {
    front: {
      enabled: boolean;
      placement: 'front';
      verticalPosition: 'upper' | 'center' | 'lower';
      designType: 'text' | 'image';
      designText?: string | null;
      designFont?: string | null;
      designFontSize?: number | null;
      textBoxWidth?: 'narrow' | 'standard' | 'wide' | null;
      designColor?: string | null;
      designImageUrl?: string | null;
    };
    back: {
      enabled: boolean;
      placement: 'back';
      verticalPosition: 'upper' | 'center' | 'lower';
      designType: 'text' | 'image';
      designText?: string | null;
      designFont?: string | null;
      designFontSize?: number | null;
      textBoxWidth?: 'narrow' | 'standard' | 'wide' | null;
      designColor?: string | null;
      designImageUrl?: string | null;
    };
  };
  deliveryName?: string;
  phoneNumber?: string;
  legacyPlacements: ILegacyPlacement[]; // existing legacy storage
  placements?: INewPlacementConfig[]; // new flexible multi-placement storage
  designAssets: IDesignAsset[];
  notes: string;
  delivery: IDelivery;
  pricing: IPricing;
  priceEstimate?: number | null;
  finalPrice?: number | null;
  status: CustomOrderStatus;
  paymentMethod: 'chapa' | 'stripe' | 'pay_on_delivery';
  statusHistory: IStatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const LegacyPlacementSchema = new Schema<ILegacyPlacement>({
  placementKey: { type: String, required: true },
  label: { type: String, required: true },
}, { _id: false });

const NewPlacementSchema = new Schema<INewPlacementConfig>({
  id: { type: String, required: true },
  area: { type: String, enum: ['front','back','left_chest','right_chest'], required: true },
  verticalPosition: { type: String, enum: ['upper','center','lower'], required: true },
  designType: { type: String, enum: ['text','image'], required: true },
  designText: { type: String },
  designFont: { type: String },
  designFontSize: { type: Number },
  textBoxWidth: { type: String, enum: ['narrow','standard','wide'] },
  designColor: { type: String },
  designImageUrl: { type: String },
}, { _id: false });

const DesignAssetSchema = new Schema<IDesignAsset>({
  placementKey: { type: String, required: true },
  type: { type: String, enum: ["image", "text"], required: true },
  sourceType: { type: String, enum: ["uploaded", "template", "ai_generated"], required: true },
  imageUrl: { type: String },
  text: { type: String },
  font: { type: String },
  fontSize: { type: Number },
  textBoxWidth: { type: String, enum: ['narrow','standard','wide'] },
  color: { type: String },
  aiPrompt: { type: String },
  templateId: { type: String },
}, { _id: false });

const DeliverySchema = new Schema<IDelivery>({
  address: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
}, { _id: false });

const PricingSchema = new Schema<IPricing>({
  basePrice: { type: Number, required: true },
  placementCost: { type: Number, required: true },
  quantityMultiplier: { type: Number, required: true },
  estimatedTotal: { type: Number, required: true },
  finalTotal: { type: Number },
}, { _id: false });

const StatusHistorySchema = new Schema<IStatusHistoryEntry>({
  status: { type: String, required: true },
  changedAt: { type: Date, required: true, default: Date.now },
  changedBy: { type: String, required: true },
}, { _id: false });

const CustomOrderSchema = new Schema<CustomOrderDocument>(
  {
    orderNumber: { type: String, unique: true, sparse: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    baseShirt: {
      productId: { type: String, required: true },
      color: { type: String, required: true },
      size: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
    },
    baseColor: { type: String },
    placement: { type: String },
    verticalPosition: { type: String, enum: ['upper','center','lower'] },
    designType: { type: String, enum: ['text','image'] },
    designText: { type: String },
    designFont: { type: String },
    designFontSize: { type: Number },
    textBoxWidth: { type: String, enum: ['narrow','standard','wide'] },
    designColor: { type: String },
    designImageUrl: { type: String },
    previewImageUrl: { type: String },
    isPublic: { type: Boolean, default: false },
    publicStatus: { type: String, enum: ['private','pending','approved','rejected'], default: 'private', index: true },
    publicTitle: { type: String },
    publicDescription: { type: String },
    linkedProductId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    quantity: { type: Number, min: 1, default: 1 },
    sides: {
      type: {
        front: {
          enabled: { type: Boolean, required: true, default: true },
          placement: { type: String, required: true, default: 'front' },
          verticalPosition: { type: String, enum: ['upper','center','lower'], required: true, default: 'upper' },
          designType: { type: String, enum: ['text','image'], required: true, default: 'text' },
          designText: { type: String },
          designFont: { type: String },
          designFontSize: { type: Number },
          textBoxWidth: { type: String, enum: ['narrow','standard','wide'] },
          designColor: { type: String },
          designImageUrl: { type: String },
        },
        back: {
          enabled: { type: Boolean, required: true, default: false },
          placement: { type: String, required: true, default: 'back' },
          verticalPosition: { type: String, enum: ['upper','center','lower'], required: true, default: 'upper' },
          designType: { type: String, enum: ['text','image'], required: true, default: 'text' },
          designText: { type: String },
          designFont: { type: String },
          designFontSize: { type: Number },
          textBoxWidth: { type: String, enum: ['narrow','standard','wide'] },
          designColor: { type: String },
          designImageUrl: { type: String },
        },
      },
      _id: false,
    },
    deliveryName: { type: String },
    phoneNumber: { type: String },
    legacyPlacements: { type: [LegacyPlacementSchema], required: true },
    placements: { type: [NewPlacementSchema], required: false },
    designAssets: { type: [DesignAssetSchema], required: true },
    notes: { type: String, default: "" },
    delivery: { type: DeliverySchema, required: true },
    pricing: { type: PricingSchema, required: true },
    priceEstimate: { type: Number },
    finalPrice: { type: Number },
    status: {
      type: String,
      enum: ['PENDING_REVIEW','ACCEPTED','APPROVED','IN_DESIGN','IN_PRINTING','READY_FOR_PICKUP','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'],
      default: 'PENDING_REVIEW',
      required: true,
    },
    paymentMethod: { type: String, enum: ['chapa', 'stripe', 'pay_on_delivery'], required: true, default: 'stripe' },
    statusHistory: { type: [StatusHistorySchema], default: [] },
  },
  { timestamps: true }
);

// Add indexes for common queries
CustomOrderSchema.index({ userId: 1, createdAt: -1 });
CustomOrderSchema.index({ status: 1, createdAt: -1 });
CustomOrderSchema.index({ placement: 1 });
CustomOrderSchema.index({ verticalPosition: 1 });
CustomOrderSchema.index({ isPublic: 1, publicStatus: 1 });
CustomOrderSchema.index({ linkedProductId: 1, publicStatus: 1 });
CustomOrderSchema.index({ orderNumber: 1 });

export const CustomOrderModel: Model<CustomOrderDocument> =
  mongoose.models.CustomOrder || mongoose.model<CustomOrderDocument>("CustomOrder", CustomOrderSchema);
