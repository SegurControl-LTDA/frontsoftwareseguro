import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-that-is-long-and-random';

interface JwtPayload {
  userId: string;
  tokenVersion: number;
  iat: number;
  exp: number;
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;

  if (!token) {
    // If no token, redirect to login page
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  try {
    // Verify the JWT
    const { payload } = await jose.jwtVerify<JwtPayload>(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );

    // Check if the user and token version are valid
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.tokenVersion !== payload.tokenVersion) {
      // If user not found or token version mismatch, session is invalid
      const url = req.nextUrl.clone();
      url.pathname = '/';
      const response = NextResponse.redirect(url);
      response.cookies.delete('auth_token'); // Clear the invalid cookie
      return response;
    }

    // Add user ID to the request headers to be used in API routes
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', user.id);

    // If token is valid, proceed to the requested page
    return NextResponse.next({ request: { headers: requestHeaders } });

  } catch (error) {
    // If token is invalid (expired, malformed, etc.), redirect to login
    const url = req.nextUrl.clone();
    url.pathname = '/';
    const response = NextResponse.redirect(url);
    response.cookies.delete('auth_token'); // Clear the invalid cookie
    return response;
  }
}

// Specify which paths the middleware should apply to
export const config = {
  matcher: ['/profile/:path*', '/api/profile/:path*'],
};
