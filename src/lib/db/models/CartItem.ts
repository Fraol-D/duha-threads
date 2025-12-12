import mongoose, { Schema, Types } from "mongoose";

export interface CartItemDocument {
  _id: string;
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  size: string;
  color: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<CartItemDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

CartItemSchema.index({ userId: 1, productId: 1, size: 1, color: 1 }, { unique: true });

export const CartItemModel = mongoose.models.CartItem || mongoose.model<CartItemDocument>("CartItem", CartItemSchema);
