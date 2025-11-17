export interface UserDocument {
  _id: string;
  name: string;
  email: string;
  hashedPassword: string;
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
  phone?: string;
  defaultAddress?: string;
  marketingEmailOptIn: boolean;
  marketingSmsOptIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toPublicUser(doc: UserDocument): PublicUser {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    defaultAddress: doc.defaultAddress,
    marketingEmailOptIn: doc.marketingEmailOptIn,
    marketingSmsOptIn: doc.marketingSmsOptIn,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
