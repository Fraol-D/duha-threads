import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/session';
import { uploadBufferToCloudinary } from '@/lib/cloudinary';
import { isAdmin } from '@/lib/auth/admin';
import { env } from '@/config/env';

const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED = ['image/png','image/jpeg','image/jpg','image/webp'];

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!isAdmin(auth.user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Defensive Cloudinary configuration check
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      console.error('Cloudinary configuration missing', {
        hasName: !!env.CLOUDINARY_CLOUD_NAME,
        hasKey: !!env.CLOUDINARY_API_KEY,
        hasSecret: !!env.CLOUDINARY_API_SECRET,
      });
      return NextResponse.json({ error: 'Cloudinary configuration missing on server' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 413 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    let result: { secure_url?: string } | null = null;
    try {
      result = await uploadBufferToCloudinary(buffer, 'duha/products') as { secure_url?: string };
    } catch (uploadErr) {
      console.error('Cloudinary upload error', uploadErr);
      return NextResponse.json({ error: 'Image upload failed' }, { status: 500 });
    }
    if (!result?.secure_url) return NextResponse.json({ error: 'Image upload failed' }, { status: 500 });
    return NextResponse.json({ success: true, url: result.secure_url });
  } catch (e) {
    console.error('Product image upload error', e);
    return NextResponse.json({ error: 'Image upload failed' }, { status: 500 });
  }
}
