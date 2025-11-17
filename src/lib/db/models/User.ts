import mongoose, { Schema } from "mongoose";
import type { UserDocument } from "@/types/user";

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    hashedPassword: { type: String, required: true },
    phone: { type: String },
    defaultAddress: { type: String },
    marketingEmailOptIn: { type: Boolean, default: false },
    marketingSmsOptIn: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const UserModel = mongoose.models.User || mongoose.model<UserDocument>("User", UserSchema);
