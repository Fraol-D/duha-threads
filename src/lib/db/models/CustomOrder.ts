import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPlacement {
  placementKey: string;
  label: string;
}

export interface IDesignAsset {
  placementKey: string;
  type: "image" | "text";
  sourceType: "uploaded" | "template" | "ai_generated";
  imageUrl?: string;
  text?: string;
  font?: string;
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
  | "PENDING_REVIEW"
  | "ACCEPTED"
  | "IN_DESIGN"
  | "IN_PRINTING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export interface CustomOrderDocument extends Document {
  userId: mongoose.Types.ObjectId | null;
  baseShirt: {
    productId: string;
    color: string;
    size: string;
    quantity: number;
  };
  placements: IPlacement[];
  designAssets: IDesignAsset[];
  notes: string;
  delivery: IDelivery;
  pricing: IPricing;
  status: CustomOrderStatus;
  statusHistory: IStatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const PlacementSchema = new Schema<IPlacement>({
  placementKey: { type: String, required: true },
  label: { type: String, required: true },
}, { _id: false });

const DesignAssetSchema = new Schema<IDesignAsset>({
  placementKey: { type: String, required: true },
  type: { type: String, enum: ["image", "text"], required: true },
  sourceType: { type: String, enum: ["uploaded", "template", "ai_generated"], required: true },
  imageUrl: { type: String },
  text: { type: String },
  font: { type: String },
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
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    baseShirt: {
      productId: { type: String, required: true },
      color: { type: String, required: true },
      size: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
    },
    placements: { type: [PlacementSchema], required: true },
    designAssets: { type: [DesignAssetSchema], required: true },
    notes: { type: String, default: "" },
    delivery: { type: DeliverySchema, required: true },
    pricing: { type: PricingSchema, required: true },
    status: {
      type: String,
      enum: ["PENDING_REVIEW", "ACCEPTED", "IN_DESIGN", "IN_PRINTING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
      default: "PENDING_REVIEW",
      required: true,
    },
    statusHistory: { type: [StatusHistorySchema], default: [] },
  },
  { timestamps: true }
);

// Add indexes for common queries
CustomOrderSchema.index({ userId: 1, createdAt: -1 });
CustomOrderSchema.index({ status: 1, createdAt: -1 });

export const CustomOrderModel: Model<CustomOrderDocument> =
  mongoose.models.CustomOrder || mongoose.model<CustomOrderDocument>("CustomOrder", CustomOrderSchema);
