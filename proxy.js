import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = new TextEncoder().encode('supers3cr3tciscok3y2026!');

export async function proxy(request) {
  const path = request.nextUrl.pathname;
  const isPublicPath = path === '/login' || path.startsWith('/api/auth');

  if (path.startsWith('/_next') || path.match(/\.(ico|png|jpg|jpeg|svg)$/)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get('cisco_session')?.value;
  let session = null;
  if (cookie) {
    try {
      const { payload } = await jwtVerify(cookie, secretKey);
      session = payload;
    } catch (err) {
    }
  }

  if (!session && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
