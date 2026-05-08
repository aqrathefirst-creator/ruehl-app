import { NextResponse } from 'next/server';

const ASSET_LINKS_BODY = JSON.stringify(
  [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.ruehl.app',
        sha256_cert_fingerprints: [
          '3F:8B:EC:41:E0:97:3B:E2:B9:A3:7B:A2:A7:05:1D:C6:A5:A4:A7:EA:08:71:12:71:1A:02:63:0D:8E:D1:BA:28',
        ],
      },
    },
  ],
  null,
  2,
);

export function GET() {
  return new NextResponse(ASSET_LINKS_BODY, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
