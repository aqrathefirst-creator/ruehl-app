import { jsonOk } from '@/lib/server/responses';

export async function GET() {
  return jsonOk({
    terms: 'RUEHL Terms of Service',
    privacy_policy: 'RUEHL Privacy Policy',
    app_version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
    support_email: 'support@ruehl.app',
  });
}
