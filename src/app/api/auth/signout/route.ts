import { NextRequest, NextResponse } from 'next/server';
import { signOut } from '@/auth';
import { COOKIE_NAME } from '@/lib/auth/token';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true });
  
  // Clear our custom auth token cookie
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  // Clear all NextAuth-related cookies
  const cookiesToClear = [
    'authjs.callback-url',
    'authjs.csrf-token',
    'authjs.pkce.code_verifier',
    'authjs.session-token',
    '__Secure-authjs.callback-url',
    '__Secure-authjs.csrf-token',
    '__Secure-authjs.pkce.code_verifier',
    '__Secure-authjs.session-token',
  ];

  cookiesToClear.forEach(cookieName => {
    response.cookies.set(cookieName, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
  });

  return response;
}

// Also handle GET for redirect-based logout
export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', req.url));
  
  // Clear our custom auth token cookie
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  // Clear all NextAuth-related cookies
  const cookiesToClear = [
    'authjs.callback-url',
    'authjs.csrf-token',
    'authjs.pkce.code_verifier',
    'authjs.session-token',
    '__Secure-authjs.callback-url',
    '__Secure-authjs.csrf-token',
    '__Secure-authjs.pkce.code_verifier',
    '__Secure-authjs.session-token',
  ];

  cookiesToClear.forEach(cookieName => {
    response.cookies.set(cookieName, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
  });

  return response;
}
