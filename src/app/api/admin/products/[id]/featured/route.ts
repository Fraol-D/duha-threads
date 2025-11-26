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
  const { isFeatured, featuredRank } = body as { isFeatured?: boolean; featuredRank?: number | null };
  if (typeof isFeatured !== 'boolean' && featuredRank == null) {
    return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
  }
  await getDb();
  const update: any = {};
  if (typeof isFeatured === 'boolean') {
    update.isFeatured = isFeatured;
    if (!isFeatured) {
      update.featuredRank = null; // clear rank when unfeaturing
    }
  }
  if (isFeatured && featuredRank != null) {
    update.featuredRank = featuredRank;
  }
  const doc = await ProductModel.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, product: { id: (doc as any)._id.toString(), isFeatured: (doc as any).isFeatured, featuredRank: (doc as any).featuredRank ?? null } });
}