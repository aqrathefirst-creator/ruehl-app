import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';

export async function POST(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as {
    target_user_id?: string;
    target_post_id?: string;
    reason?: string;
  } | null;

  const targetUserId = body?.target_user_id?.trim();
  const targetPostId = body?.target_post_id?.trim();
  const reason = body?.reason?.trim();

  if (!targetUserId && !targetPostId) return jsonError('target_user_id or target_post_id is required', 400);
  if (targetUserId && targetUserId === auth.user.id) return jsonError('You cannot report yourself', 400);
  if (!reason || reason.length < 5) return jsonError('reason must be at least 5 characters', 400);

  const { data, error } = await auth.supabase
    .from('user_reports')
    .insert({
      reporter_id: auth.user.id,
      target_user_id: targetUserId || null,
      target_post_id: targetPostId || null,
      reason,
    })
    .select('id, reporter_id, target_user_id, target_post_id, reason, created_at')
    .single();

  if (error) return jsonError(error.message, 400);

  return jsonOk({ item: data }, 201);
}