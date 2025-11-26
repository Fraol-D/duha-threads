import { NextRequest, NextResponse } from 'next/server';
import { DesignTemplate } from '@/lib/db/models/DesignTemplate';
import '@/lib/db/connection';
import { assertAdmin } from '@/lib/auth/admin';
import { verifyAuth } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    assertAdmin(auth.user);
    const body = await req.json();
    const { name, slug, description, previewImageUrl, placements = [], tags = [], isFeatured = false, isActive = true } = body;
    if (!name || !slug) return NextResponse.json({ error: 'name and slug required' }, { status: 400 });
    const exists = await DesignTemplate.findOne({ slug: slug.toLowerCase() });
    if (exists) return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    const doc = await DesignTemplate.create({
      name,
      slug: slug.toLowerCase(),
      description,
      previewImageUrl,
      placements,
      tags,
      isFeatured,
      isActive,
    });
    return NextResponse.json({ template: doc }, { status: 201 });
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json({ error: 'Failed to create template', detail: err.message }, { status });
  }
}