import mongoose, { Schema, Types, Document, Model } from "mongoose";

// Support both legacy statuses and new pipeline statuses for backward compatibility.
export type OrderStatus =
  | "Pending" // legacy
  | "Accepted" // legacy
  | "In Printing" // legacy
  | "Out for Delivery" // legacy
  | "Delivered" // legacy
  | "Cancelled" // legacy
  | "PENDING" // new
  | "CONFIRMED" // new
  | "SHIPPED" // new
  | "COMPLETED" // new
  | "CANCELED"; // new (American spelling)

export interface OrderItem {
  productId: Types.ObjectId;
  name: string; // snapshot at the time of purchase
  imageUrl?: string; // snapshot thumbnail
  unitPrice: number; // snapshot per unit
  quantity: number;
  subtotal: number; // quantity * unitPrice
  // legacy retained (size/color/price) for backward compatibility if older code reads them
  size?: string;
  color?: string;
  price?: number; // legacy field
}

export interface OrderDocument extends Document {
  userId: Types.ObjectId;
  items: OrderItem[];
  orderNumber?: string; // human-friendly identifier
  // Legacy flat delivery fields
  deliveryAddress?: string;
  phone?: string;
  email?: string;
  // New structured delivery info
  deliveryInfo: {
    name?: string;
    phone?: string;
    address?: string;
    notes?: string;
  };
  subtotal: number; // sum of item subtotals
  totalAmount: number; // alias for subtotal (future: add shipping, tax)
  currency: string;
  status: OrderStatus;
  isCustomOrder: boolean;
  customOrderId?: Types.ObjectId | null;
  paymentProvider?: "chapa" | "manual" | "none";
  paymentStatus?: "unpaid" | "pending" | "paid" | "failed" | "refunded";
  paymentReference?: string | null;
  paymentChannel?: string | null;
  paymentCurrency?: string | null;
  paymentAmount?: number | null;
  refundStatus?: "none" | "requested" | "processing" | "refunded" | "rejected";
  refundAmount?: number | null;
  refundReason?: string | null;
  refundAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<OrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    imageUrl: { type: String },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
    // legacy optional fields
    size: { type: String },
    color: { type: String },
    price: { type: Number, min: 0 },
  },
  { _id: false }
);

const OrderSchema = new Schema<OrderDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: { type: [OrderItemSchema], required: true },
    orderNumber: { type: String, index: true, unique: true, sparse: true },
    // Legacy flat fields retained (may be null moving forward)
    deliveryAddress: { type: String },
    phone: { type: String },
    email: { type: String },
    // New structured delivery info
    deliveryInfo: {
      type: {
        name: { type: String },
        phone: { type: String },
        address: { type: String },
        notes: { type: String },
      },
      required: true,
      _id: false,
      default: {},
    },
    subtotal: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'USD' },
    status: {
      type: String,
      enum: [
        "Pending","Accepted","In Printing","Out for Delivery","Delivered","Cancelled",
        "PENDING","CONFIRMED","SHIPPED","COMPLETED","CANCELED"
      ],
      default: "PENDING",
      index: true
    },
    isCustomOrder: { type: Boolean, required: true, default: false },
    customOrderId: { type: Schema.Types.ObjectId, ref: 'CustomOrder', default: null },
    paymentProvider: { type: String, enum: ["chapa","manual","none"], default: "none" },
    paymentStatus: { type: String, enum: ["unpaid","pending","paid","failed","refunded"], default: "unpaid", index: true },
    paymentReference: { type: String, default: null, index: true },
    paymentChannel: { type: String, default: null },
    paymentCurrency: { type: String, default: null },
    paymentAmount: { type: Number, default: null, min: 0 },
    refundStatus: { type: String, enum: ["none","requested","processing","refunded","rejected"], default: "none", index: true },
    refundAmount: { type: Number, default: null, min: 0 },
    refundReason: { type: String, default: null },
    refundAt: { type: Date, default: null },
  },
  { timestamps: true }
);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ paymentReference: 1 });
OrderSchema.index({ paymentStatus: 1 });

// Pre-save normalization: ensure subtotal & totalAmount consistent if items changed.
OrderSchema.pre('save', function(next) {
  try {
    if (this.isModified('items')) {
      const sum = this.items.reduce((acc: number, it: OrderItem) => acc + (it.subtotal || (it.unitPrice * it.quantity)), 0);
      this.subtotal = sum;
      this.totalAmount = sum; // future: add shipping/tax adjustments
    }
    // Backward compatibility: if legacy flat fields exist but deliveryInfo.address missing, hydrate deliveryInfo
    if (!this.deliveryInfo.address && this.deliveryAddress) {
      this.deliveryInfo.address = this.deliveryAddress;
    }
    if (!this.deliveryInfo.phone && this.phone) {
      this.deliveryInfo.phone = this.phone;
    }
    if (!this.deliveryInfo.name && this.email) {
      // attempt to derive name if not provided – placeholder
      this.deliveryInfo.name = undefined;
    }
    return next();
  } catch (err) {
    return next(err as unknown as Error);
  }
});

export const OrderModel: Model<OrderDocument> = mongoose.models.Order || mongoose.model<OrderDocument>("Order", OrderSchema);
