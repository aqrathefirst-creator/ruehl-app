import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/** Wrong-product or duplicate surfaces → home until native translation rebuild. */
const LEGACY_REDIRECTS = ['/sessions', '/room', '/powr', '/charts', '/onboarding'];

/** Consumer routes not ready for web launch → home. */
const COMING_SOON_REDIRECTS = ['/saved-sounds', '/messages'];

function shouldRedirectToHome(pathname: string, prefixes: string[]): boolean {
  for (const route of prefixes) {
    if (pathname === route || pathname.startsWith(`${route}/`)) return true;
  }
  return false;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (shouldRedirectToHome(pathname, LEGACY_REDIRECTS) || shouldRedirectToHome(pathname, COMING_SOON_REDIRECTS)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-pathname', pathname);
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/sessions/:path*',
    '/room/:path*',
    '/powr/:path*',
    '/charts/:path*',
    '/onboarding/:path*',
    '/saved-sounds/:path*',
    '/messages/:path*',
    '/admin',
    '/admin/:path*',
  ],
};
