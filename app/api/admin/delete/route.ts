import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

export async function POST(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as { user_id?: string; confirm?: string } | null;
  const userId = body?.user_id?.trim();

  if (!userId) return jsonError('user_id is required', 400);
  if (userId === auth.user.id) return jsonError('You cannot delete yourself', 400);
  if (body?.confirm !== 'DELETE') return jsonError('Explicit DELETE confirmation is required', 400);

  const cleanup = await auth.supabase.rpc('admin_delete_user', { target_user_id: userId });
  if (cleanup.error) return jsonError(cleanup.error.message, 400);

  const { error } = await auth.admin.auth.admin.deleteUser(userId);
  if (error) return jsonError(error.message, 400);

  return jsonOk({ success: true });
}