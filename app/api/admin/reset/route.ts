import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

export async function POST(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as { user_id?: string; email?: string } | null;
  const userId = body?.user_id?.trim();

  if (!userId) return jsonError('user_id is required', 400);

  const userResult = await auth.admin.auth.admin.getUserById(userId);
  if (userResult.error) return jsonError(userResult.error.message, 400);

  const registeredEmail = userResult.data.user?.email?.trim().toLowerCase();
  const overrideEmail = body?.email?.trim().toLowerCase();
  const targetEmail = overrideEmail || registeredEmail;

  if (!targetEmail) return jsonError('Target user has no email for password reset', 400);
  if (!targetEmail.includes('@')) return jsonError('Invalid reset email', 400);

  const appBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const { error } = await auth.admin.auth.resetPasswordForEmail(targetEmail, {
    redirectTo: `${appBaseUrl}/reset-password`,
  });

  if (error) return jsonError(error.message, 400);

  return jsonOk({ success: true, email: targetEmail });
}