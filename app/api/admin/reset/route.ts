import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

export async function POST(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as { user_id?: string } | null;
  const userId = body?.user_id?.trim();

  if (!userId) return jsonError('user_id is required', 400);

  const { error } = await auth.supabase.rpc('admin_reset_user', { target_user_id: userId });

  if (error) return jsonError(error.message, 400);

  return jsonOk({ success: true });
}