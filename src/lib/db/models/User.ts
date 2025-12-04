import mongoose, { Schema } from "mongoose";
import type { UserDocument } from "@/types/user";

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    hashedPassword: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    phone: { type: String },
    defaultAddress: { type: String },
    marketingEmailOptIn: { type: Boolean, default: false },
    marketingSmsOptIn: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorCode: { type: String, default: null },
    twoFactorExpiresAt: { type: Date, default: null },
    twoFactorVerifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const UserModel = mongoose.models.User || mongoose.model<UserDocument>("User", UserSchema);
