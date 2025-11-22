import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import { CustomOrderModel } from '@/lib/db/models/CustomOrder';
import { verifyAuth } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.user || !isAdmin(auth.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const q = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (q) filter['delivery.email'] = { $regex: q, $options: 'i' };
    const skip = (page - 1) * pageSize;
    const [ordersRaw, total] = await Promise.all([
      CustomOrderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      CustomOrderModel.countDocuments(filter)
    ]);
    const orders = ordersRaw.map(o => ({
      id: o._id.toString(),
      userId: o.userId?.toString() || null,
      status: o.status,
      baseColor: o.baseColor || o.baseShirt.color,
      placement: o.placement || o.legacyPlacements?.[0]?.placementKey || (o.placements?.find(p=>p.area==='front')?.area) || o.placements?.[0]?.area || null,
      verticalPosition: o.verticalPosition || null,
      designType: o.designType || (o.designAssets[0]?.type as ('text'|'image')|undefined) || null,
      designText: o.designText || o.designAssets.find(a=>a.type==='text')?.text || null,
      designImageUrl: o.designImageUrl || o.designAssets.find(a=>a.type==='image')?.imageUrl || null,
      quantity: o.quantity || o.baseShirt?.quantity || 1,
      previewImageUrl: o.previewImageUrl || null,
      estimatedTotal: o.pricing.estimatedTotal,
      finalTotal: o.pricing.finalTotal ?? null,
      createdAt: o.createdAt,
      delivery: o.delivery,
    }));
    return NextResponse.json({ page, pageSize, total, totalPages: Math.ceil(total / pageSize), orders });
  } catch (e) {
    console.error('Admin list custom orders error', e);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
