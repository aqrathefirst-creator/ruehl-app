import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/** Lets `app/admin/layout.tsx` skip the admin gate for `/admin/login` while staying a server component. */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/admin/:path*'],
};
