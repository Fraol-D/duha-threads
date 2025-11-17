import mongoose, { Schema, Types } from "mongoose";

export type OrderStatus =
  | "Pending"
  | "Accepted"
  | "In Printing"
  | "Out for Delivery"
  | "Delivered"
  | "Cancelled";

export interface OrderItem {
  productId: Types.ObjectId;
  name: string; // snapshot at the time of purchase
  price: number; // snapshot per unit
  size: string;
  color: string;
  quantity: number;
}

export interface OrderDocument {
  _id: string;
  userId: Types.ObjectId;
  items: OrderItem[];
  deliveryAddress: string;
  phone: string;
  email: string;
  subtotal: number;
  total: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<OrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    size: { type: String, required: true },
    color: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const OrderSchema = new Schema<OrderDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: { type: [OrderItemSchema], required: true },
    deliveryAddress: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["Pending","Accepted","In Printing","Out for Delivery","Delivered","Cancelled"], default: "Pending", index: true },
  },
  { timestamps: true }
);

OrderSchema.index({ userId: 1, createdAt: -1 });

export const OrderModel = mongoose.models.Order || mongoose.model<OrderDocument>("Order", OrderSchema);
