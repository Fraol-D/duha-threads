type EventType = 'template_view' | 'template_apply' | 'custom_order_started' | 'custom_order_completed';

interface LogEventOptions {
  type: EventType;
  entityId?: string | null;
  metadata?: Record<string, any> | null;
}

export async function logEvent(opts: LogEventOptions) {
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: opts.type, entityId: opts.entityId || null, metadata: opts.metadata || null }),
    });
  } catch {
    // swallow errors; event logging should never block UX
  }
}