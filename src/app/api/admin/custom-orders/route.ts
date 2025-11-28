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
    const publicStatus = searchParams.get('publicStatus');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (publicStatus && ['private','pending','approved','rejected'].includes(publicStatus)) {
      filter.publicStatus = publicStatus;
    }
    if (q) filter['delivery.email'] = { $regex: q, $options: 'i' };
    const skip = (page - 1) * pageSize;
    const [ordersRaw, total] = await Promise.all([
      CustomOrderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      CustomOrderModel.countDocuments(filter)
    ]);
    const orders = ordersRaw.map(o => {
      const placements = Array.isArray(o.placements) ? o.placements : [];
      const legacyPlacements = Array.isArray(o.legacyPlacements) ? o.legacyPlacements : [];
      const designAssets = Array.isArray(o.designAssets) ? o.designAssets : [];
      const firstTextAsset = designAssets.find(a => a.type === 'text');
      const firstImageAsset = designAssets.find(a => a.type === 'image');
      return {
        id: o._id.toString(),
        userId: o.userId?.toString() || null,
        status: o.status,
        baseColor: o.baseColor || o.baseShirt?.color,
        baseShirt: o.baseShirt,
        placement: o.placement || legacyPlacements[0]?.placementKey || placements.find(p=>p.area==='front')?.area || placements[0]?.area || null,
        verticalPosition: o.verticalPosition || null,
        designType: o.designType || (firstImageAsset ? 'image' : firstTextAsset ? 'text' : null),
        designText: o.designText || firstTextAsset?.text || null,
        designFont: o.designFont || firstTextAsset?.font || null,
        designFontSize: o.designFontSize || firstTextAsset?.fontSize || null,
        textBoxWidth: o.textBoxWidth || firstTextAsset?.textBoxWidth || null,
        designColor: o.designColor || firstTextAsset?.color || null,
        designImageUrl: o.designImageUrl || firstImageAsset?.imageUrl || null,
        quantity: o.quantity || o.baseShirt?.quantity || 1,
        previewImageUrl: o.previewImageUrl || null,
        estimatedTotal: o.pricing.estimatedTotal,
        finalTotal: o.pricing.finalTotal ?? null,
        createdAt: o.createdAt,
        delivery: o.delivery,
        placements,
        legacyPlacements,
        designAssets,
        sides: o.sides,
        publicStatus: o.publicStatus || (o.isPublic ? 'approved' : 'private'),
        isPublic: o.isPublic ?? false,
        publicTitle: o.publicTitle || null,
        publicDescription: o.publicDescription || null,
        linkedProductId: o.linkedProductId ? o.linkedProductId.toString() : null,
        // Multi-placement summary
        areas: placements.length > 0
          ? placements.map(p => p.area)
          : legacyPlacements.map(lp => lp.placementKey),
      };
    });
    return NextResponse.json({ page, pageSize, total, totalPages: Math.ceil(total / pageSize), orders });
  } catch (e) {
    console.error('Admin list custom orders error', e);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
