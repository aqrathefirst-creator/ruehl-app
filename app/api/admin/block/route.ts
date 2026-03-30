import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

export async function POST(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as { user_id?: string } | null;
  const userId = body?.user_id?.trim();

  if (!userId) return jsonError('user_id is required', 400);
  if (userId === auth.user.id) return jsonError('You cannot block yourself', 400);

  const { data: existing } = await auth.admin
    .from('blocked_users')
    .select('id')
    .eq('blocker_id', auth.user.id)
    .eq('blocked_id', userId)
    .maybeSingle();

  if (existing) return jsonOk({ success: true, already_blocked: true });

  const { error } = await auth.admin
    .from('blocked_users')
    .insert({ blocker_id: auth.user.id, blocked_id: userId });

  if (error) return jsonError(error.message, 400);

  return jsonOk({ success: true });
}