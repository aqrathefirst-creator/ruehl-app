import { NextResponse } from 'next/server';

const APPLE_APP_SITE_ASSOCIATION = {
  applinks: {
    apps: [] as string[],
    details: [
      {
        appID: '77MV336G7W.com.ruehl.app',
        paths: ['*'],
      },
    ],
  },
};

export function GET() {
  return new NextResponse(JSON.stringify(APPLE_APP_SITE_ASSOCIATION), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
