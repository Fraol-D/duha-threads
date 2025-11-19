export interface DesignTemplatePlacement {
  placementKey: string;
  type: 'image' | 'text' | 'combo';
  imageUrl?: string | null;
  text?: string | null;
  font?: string | null;
  color?: string | null;
}

export interface DesignTemplateType {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  previewImageUrl?: string;
  placements: DesignTemplatePlacement[];
  tags: string[];
  isFeatured: boolean;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export type EventLogType = 'template_view' | 'template_apply' | 'custom_order_started' | 'custom_order_completed';

export interface EventLogRecord {
  _id: string;
  userId?: string | null;
  type: EventLogType;
  entityId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}