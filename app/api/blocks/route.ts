import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';

export async function GET(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { data, error } = await auth.supabase
    .from('blocked_users')
    .select('id, blocked_id, created_at')
    .eq('blocker_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) return jsonError(error.message, 400);

  const blockedRows = (data || []) as Array<{ id: string; blocked_id: string; created_at: string }>;
  const blockedIds = blockedRows.map((row) => row.blocked_id).filter(Boolean);

  let profileById: Record<string, { id: string; username: string; avatar_url: string | null }> = {};

  if (blockedIds.length > 0) {
    const { data: profilesData } = await auth.supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', blockedIds);

    profileById = ((profilesData || []) as Array<{ id: string; username: string; avatar_url: string | null }>).reduce(
      (acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      },
      {} as Record<string, { id: string; username: string; avatar_url: string | null }>
    );
  }

  const items = blockedRows.map((row) => ({
    ...row,
    blocked: profileById[row.blocked_id] || null,
  }));

  return jsonOk({ items });
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
