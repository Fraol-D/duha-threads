import { NextRequest, NextResponse } from 'next/server';
import { DesignTemplate } from '@/lib/db/models/DesignTemplate';
import '@/lib/db/connection';
import { assertAdmin } from '@/lib/auth/admin';
import { verifyAuth } from '@/lib/auth/session';
import { isValidObjectId } from 'mongoose';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuth(req);
    assertAdmin(auth.user);
    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const body = await req.json();
    const allowed = ['name','description','previewImageUrl','placements','tags','isFeatured','isActive'];
    const update: any = {};
    for (const key of allowed) if (key in body) update[key] = body[key];
    if (body.slug) {
      const existing = await DesignTemplate.findOne({ slug: body.slug.toLowerCase(), _id: { $ne: id } });
      if (existing) return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
      update.slug = body.slug.toLowerCase();
    }
    const doc = await DesignTemplate.findByIdAndUpdate(id, update, { new: true });
    if (!doc) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    return NextResponse.json({ template: doc });
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json({ error: 'Failed to update template', detail: err.message }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuth(req);
    assertAdmin(auth.user);
    const { id } = await params;
    if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const doc = await DesignTemplate.findById(id);
    if (!doc) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    await doc.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json({ error: 'Failed to delete template', detail: err.message }, { status });
  }
}