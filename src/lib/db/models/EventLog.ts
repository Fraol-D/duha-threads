import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type EventLogType = 'template_view' | 'template_apply' | 'custom_order_started' | 'custom_order_completed';

export interface IEventLog extends Document {
  userId?: Types.ObjectId | null;
  type: EventLogType;
  entityId?: string | null; // templateId or customOrderId
  metadata?: Record<string, any> | null;
  createdAt: Date;
}

const EventLogSchema = new Schema<IEventLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  type: { type: String, required: true, enum: ['template_view','template_apply','custom_order_started','custom_order_completed'] },
  entityId: { type: String, index: true },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });

EventLogSchema.index({ type: 1, createdAt: -1 });

let EventLogModel: Model<IEventLog>;
try {
  EventLogModel = mongoose.model<IEventLog>('EventLog');
} catch {
  EventLogModel = mongoose.model<IEventLog>('EventLog', EventLogSchema);
}

export const EventLog = EventLogModel;