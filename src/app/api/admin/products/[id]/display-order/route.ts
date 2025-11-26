import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/session';
import { isAdminEmail } from '@/config/admin-public';
import { getDb } from '@/lib/db/connection';
import { ProductModel } from '@/lib/db/models/Product';

interface Params { id: string }

export async function PATCH(req: NextRequest, ctx: { params: Promise<Params> | Params }) {
  const params = await ctx.params;
  const { id } = params;
  const auth = await verifyAuth(req);
  if (!auth.user || !isAdminEmail(auth.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const rawValue = body?.displayOrder;
  const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
  if (!Number.isFinite(numericValue)) {
    return NextResponse.json({ error: 'displayOrder must be a number' }, { status: 400 });
  }
  await getDb();
  const doc = await ProductModel.findByIdAndUpdate(id, { displayOrder: numericValue }, { new: true, projection: { displayOrder: 1 } }).lean();
  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, displayOrder: (doc as { displayOrder?: number }).displayOrder ?? 0 });
}
