import { NextRequest, NextResponse } from 'next/server';
import '../auth/signup/route'; // ensure DB init side-effects if any
import { DesignTemplate } from '@/lib/db/models/DesignTemplate';
import '@/lib/db/connection';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const tag = searchParams.get('tag');
    const featured = searchParams.get('featured');
    const limit = Math.min(parseInt(searchParams.get('limit') || '12', 10), 48);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const skip = (page - 1) * limit;

    const filter: any = { isActive: true };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
      ];
    }
    if (tag) filter.tags = tag;
    if (featured === 'true') filter.isFeatured = true;

    const [items, total] = await Promise.all([
      DesignTemplate.find(filter).sort({ usageCount: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      DesignTemplate.countDocuments(filter),
    ]);

    return NextResponse.json({
      templates: items,
      page,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to list templates', detail: err.message }, { status: 500 });
  }
}