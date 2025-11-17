import mongoose, { Schema, Types } from "mongoose";

export interface WishlistItemDocument {
  _id: string;
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WishlistItemSchema = new Schema<WishlistItemDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  },
  { timestamps: true }
);

WishlistItemSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const WishlistItemModel = mongoose.models.WishlistItem || mongoose.model<WishlistItemDocument>("WishlistItem", WishlistItemSchema);
