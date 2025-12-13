import { NextRequest, NextResponse } from 'next/server';
import { signOut } from '@/auth';
import { COOKIE_NAME } from '@/lib/auth/token';

export async function POST(req: NextRequest) {
  // Clear our custom auth token cookie
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // This deletes the cookie
  });

  return response;
}

// Also handle GET for redirect-based logout
export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', req.url));
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // This deletes the cookie
  });

  return response;
}
