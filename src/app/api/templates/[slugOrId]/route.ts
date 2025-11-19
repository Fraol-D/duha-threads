import { NextRequest, NextResponse } from 'next/server';
import { DesignTemplate } from '@/lib/db/models/DesignTemplate';
import '@/lib/db/connection';
import { isValidObjectId } from 'mongoose';

export async function GET(_req: NextRequest, { params }: { params: { slugOrId: string } }) {
  try {
    const { slugOrId } = params;
    const query = isValidObjectId(slugOrId)
      ? { _id: slugOrId }
      : { slug: slugOrId.toLowerCase() };
    const doc = await DesignTemplate.findOne(query).lean();
    if (!doc || !doc.isActive) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    return NextResponse.json({ template: doc });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch template', detail: err.message }, { status: 500 });
  }
}