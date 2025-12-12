import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDesignTemplatePlacement {
  placementKey: string; // 'front' | 'back' | 'chest' etc
  type: 'image' | 'text' | 'combo';
  imageUrl?: string | null;
  text?: string | null;
  font?: string | null;
  color?: string | null;
}

export interface IDesignTemplate extends Document {
  name: string;
  slug: string;
  description?: string;
  previewImageUrl?: string;
  placements: IDesignTemplatePlacement[];
  tags: string[];
  isFeatured: boolean;
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlacementSchema = new Schema<IDesignTemplatePlacement>({
  placementKey: { type: String, required: true, trim: true },
  type: { type: String, enum: ['image', 'text', 'combo'], required: true },
  imageUrl: { type: String },
  text: { type: String },
  font: { type: String },
  color: { type: String },
}, { _id: false });

const DesignTemplateSchema = new Schema<IDesignTemplate>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String },
  previewImageUrl: { type: String },
  placements: { type: [PlacementSchema], default: [] },
  tags: { type: [String], index: true, default: [] },
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  usageCount: { type: Number, default: 0 },
}, { timestamps: true });

DesignTemplateSchema.index({ isActive: 1, usageCount: -1 });
DesignTemplateSchema.index({ tags: 1 });

let DesignTemplateModel: Model<IDesignTemplate>;
try {
  DesignTemplateModel = mongoose.model<IDesignTemplate>('DesignTemplate');
} catch {
  DesignTemplateModel = mongoose.model<IDesignTemplate>('DesignTemplate', DesignTemplateSchema);
}

export const DesignTemplate = DesignTemplateModel;