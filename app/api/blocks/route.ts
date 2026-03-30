import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';

export async function GET(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { data, error } = await auth.supabase
    .from('blocked_users')
    .select('id, blocked_id, created_at, blocked:profiles!blocked_users_blocked_id_fkey(id, username, avatar_url)')
    .eq('blocker_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) return jsonError(error.message, 400);

  return jsonOk({ items: data || [] });
}

export async function POST(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as { blocked_id?: string } | null;
  const blockedId = body?.blocked_id?.trim();

  if (!blockedId) return jsonError('blocked_id is required', 400);
  if (blockedId === auth.user.id) return jsonError('You cannot block yourself', 400);

  const { data, error } = await auth.supabase
    .from('blocked_users')
    .insert({ blocker_id: auth.user.id, blocked_id: blockedId })
    .select('id, blocker_id, blocked_id, created_at')
    .single();

  if (error) return jsonError(error.message, 400);

  return jsonOk({ item: data }, 201);
}

export async function DELETE(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const blockedId = url.searchParams.get('blocked_id')?.trim();

  if (!blockedId) return jsonError('blocked_id query param is required', 400);

  const { error } = await auth.supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', auth.user.id)
    .eq('blocked_id', blockedId);

  if (error) return jsonError(error.message, 400);

  return jsonOk({ success: true });
}
