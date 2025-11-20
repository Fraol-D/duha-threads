import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifyAuth } from '@/lib/auth/session';
import { promises as fs } from 'fs';
import path from 'path';

// Simple local upload handler; for production replace with S3 or similar.
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 413 });
    }

    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'custom-designs');
    await fs.mkdir(uploadsDir, { recursive: true });
    const ext = file.type === 'image/png' ? 'png' : 'jpg';
    const filename = `${randomUUID()}.${ext}`;
    const fullPath = path.join(uploadsDir, filename);
    await fs.writeFile(fullPath, buffer);
    const publicUrl = `/uploads/custom-designs/${filename}`;

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('Upload error', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
