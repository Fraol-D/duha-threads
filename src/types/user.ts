import type { HydratedDocument, Types } from "mongoose";

export interface UserDocument {
  _id: string | Types.ObjectId;
  name: string;
  email: string;
  hashedPassword: string;
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
  const createdAt = doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt);
  const updatedAt = doc.updatedAt instanceof Date ? doc.updatedAt : new Date(doc.updatedAt);

  return {
    id,
    name: doc.name,
    email: doc.email,
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
