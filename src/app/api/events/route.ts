import { NextRequest, NextResponse } from 'next/server';
import '@/lib/db/connection';
import { EventLog } from '@/lib/db/models/EventLog';
import { DesignTemplate } from '@/lib/db/models/DesignTemplate';
import { getCurrentUser } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, entityId, metadata } = body || {};
    if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 });
    if (!['template_view','template_apply','custom_order_started','custom_order_completed'].includes(type)) {
      return NextResponse.json({ error: 'invalid type' }, { status: 400 });
    }
    const user = await getCurrentUser().catch(() => null);
    const userId = (user as any)?._id || null;
    await EventLog.create({ type, entityId: entityId || null, metadata: metadata || null, userId });
    if (type === 'template_apply' && entityId) {
      await DesignTemplate.findByIdAndUpdate(entityId, { $inc: { usageCount: 1 } }).catch(() => {});
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to log event', detail: err.message }, { status: 500 });
  }
}