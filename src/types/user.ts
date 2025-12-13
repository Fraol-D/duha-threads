import type { HydratedDocument, Types } from "mongoose";

export interface UserDocument {
  _id: string | Types.ObjectId;
  name: string;
  email: string;
  image?: string;
  hashedPassword?: string | null;
  role: "user" | "admin";
  status: "active" | "inactive";
  phone?: string;
  defaultAddress?: string;
  marketingEmailOptIn: boolean;
  marketingSmsOptIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: "user" | "admin";
  status: "active" | "inactive";
  phone?: string;
  defaultAddress?: string;
  marketingEmailOptIn: boolean;
  marketingSmsOptIn: boolean;
  createdAt: string;
  updatedAt: string;
}

type SerializableUser = UserDocument | HydratedDocument<UserDocument>;

export function toPublicUser(doc: SerializableUser): PublicUser {

  const id = typeof doc._id === "string" ? doc._id : doc._id.toString();
  // Handle missing or invalid date fields gracefully
  let createdAt: Date;
  let updatedAt: Date;
  try {
    createdAt = doc.createdAt ? new Date(doc.createdAt) : new Date();
    if (isNaN(createdAt.getTime())) createdAt = new Date();
  } catch {
    createdAt = new Date();
  }
  try {
    updatedAt = doc.updatedAt ? new Date(doc.updatedAt) : new Date();
    if (isNaN(updatedAt.getTime())) updatedAt = new Date();
  } catch {
    updatedAt = new Date();
  }

  return {
    id,
    name: doc.name,
    email: doc.email,
    image: (doc as any).image,
    role: doc.role,
    status: (doc.status as "active" | "inactive") ?? "active",
    phone: doc.phone,
    defaultAddress: doc.defaultAddress,
    marketingEmailOptIn: doc.marketingEmailOptIn,
    marketingSmsOptIn: doc.marketingSmsOptIn,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}
