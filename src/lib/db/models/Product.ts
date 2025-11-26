import mongoose, { Schema } from "mongoose";
import type { ProductDocument, ProductImageDocument } from "@/types/product";

const ProductImageSchema = new Schema<ProductImageDocument>(
  {
    url: { type: String, required: true },
    alt: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProductSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true },
    basePrice: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, index: true },
    colors: { type: [String], required: true, default: [] },
    sizes: { type: [String], required: true, default: [] },
    images: { type: [ProductImageSchema], required: true, default: [] },
    isActive: { type: Boolean, default: true, index: true },
    salesCount: { type: Number, default: 0, index: true },
    viewCount: { type: Number, default: 0 },
    sku: { type: String, required: false },
    // Featured product controls
    isFeatured: { type: Boolean, default: false, index: true },
    featuredRank: { type: Number, required: false, default: null },
    displayOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

// Compound indexes for filtering and sorting
ProductSchema.index({ isActive: 1, category: 1 });
ProductSchema.index({ isActive: 1, salesCount: -1 });
ProductSchema.index({ isActive: 1, createdAt: -1 });
ProductSchema.index({ isActive: 1, basePrice: 1 });
// Featured query optimization
ProductSchema.index({ isFeatured: 1, featuredRank: 1 });

export const ProductModel =
  mongoose.models.Product || mongoose.model<ProductDocument>("Product", ProductSchema);
