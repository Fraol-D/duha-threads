import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ProductRatingDocument extends Document {
  productId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  rating: number;
  comment?: string | null;
  orderId?: mongoose.Types.ObjectId | null;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductRatingSchema = new Schema<ProductRatingDocument>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: null, maxlength: 500 },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
    featured: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

ProductRatingSchema.index({ productId: 1, userId: 1 }, { unique: true });
ProductRatingSchema.index({ productId: 1, updatedAt: -1 });

export const ProductRatingModel: Model<ProductRatingDocument> =
  mongoose.models.ProductRating || mongoose.model<ProductRatingDocument>("ProductRating", ProductRatingSchema);
