import mongoose, { Schema } from "mongoose";
import type { UserDocument } from "@/types/user";


const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    image: { type: String },
    hashedPassword: { type: String, required: false, default: null },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    phone: { type: String },
    defaultAddress: { type: String },
    marketingEmailOptIn: { type: Boolean, default: false },
    marketingSmsOptIn: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Cascade delete accounts when a user is deleted
UserSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    const db = doc.constructor.db;
    await db.collection('accounts').deleteMany({ userId: doc._id.toString() });
  }
});

export const UserModel = mongoose.models.User || mongoose.model<UserDocument>("User", UserSchema);
