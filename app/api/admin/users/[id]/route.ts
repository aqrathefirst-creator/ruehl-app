import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

type AdminAction = 'verify' | 'shadow_ban' | 'suspend' | 'reset_password' | 'delete_user' | 'add_note';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { id } = await params;
  const userId = id?.trim();
  if (!userId) return jsonError('user id is required', 400);

  const [userResult, profileResult, activityResult, postsResult, reportsResult, notesResult] = await Promise.all([
    auth.admin.auth.admin.getUserById(userId),
    auth.admin
      .from('profiles')
      .select('id, username, bio, avatar_url, is_verified, verified, is_admin, shadow_banned, suspended_until, created_at')
      .eq('id', userId)
      .maybeSingle(),
    auth.admin
      .from('user_activity')
      .select('id, user_id, target_id, type, created_at')
      .or(`user_id.eq.${userId},target_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(40),
    auth.admin
      .from('posts')
      .select('id, content, media_url, created_at, hidden_by_admin, discovery_disabled, moderation_state, visibility_state')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12),
    auth.admin
      .from('user_reports')
      .select('id, reporter_id, target_user_id, target_post_id, reason, created_at, admin_status, admin_action, admin_note, resolved_at')
      .or(`target_user_id.eq.${userId},reporter_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(40),
    auth.admin
      .from('admin_user_notes')
      .select('id, note, admin_user_id, created_at')
      .eq('target_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (userResult.error) return jsonError(userResult.error.message, 400);
  if (profileResult.error) return jsonError(profileResult.error.message, 400);
  if (activityResult.error) return jsonError(activityResult.error.message, 400);
  if (postsResult.error) return jsonError(postsResult.error.message, 400);
  if (reportsResult.error) return jsonError(reportsResult.error.message, 400);
  if (notesResult.error) return jsonError(notesResult.error.message, 400);

  return jsonOk({
    user: userResult.data?.user || null,
    profile: profileResult.data || null,
    activity: activityResult.data || [],
    posts: postsResult.data || [],
    reports: reportsResult.data || [],
    notes: notesResult.data || [],
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { id } = await params;
  const userId = id?.trim();
  if (!userId) return jsonError('user id is required', 400);

  const body = (await request.json().catch(() => null)) as {
    action?: AdminAction;
    value?: boolean;
    days?: number;
    note?: string;
    confirm?: string;
  } | null;

  const action = body?.action;
  if (!action) return jsonError('action is required', 400);

  if (action === 'verify') {
    const next = body?.value === true;
    const { error } = await auth.admin
      .from('profiles')
      .update({ is_verified: next, verified: next })
      .eq('id', userId);

    if (error) return jsonError(error.message, 400);
    return jsonOk({ success: true });
  }

  if (action === 'shadow_ban') {
    const next = body?.value === true;
    const { error } = await auth.admin.from('profiles').update({ shadow_banned: next }).eq('id', userId);
    if (error) return jsonError(error.message, 400);
    return jsonOk({ success: true });
  }

  if (action === 'suspend') {
    const days = Math.max(0, Number(body?.days || 0));
    const suspendedUntil = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;
    const { error } = await auth.admin.from('profiles').update({ suspended_until: suspendedUntil }).eq('id', userId);
    if (error) return jsonError(error.message, 400);
    return jsonOk({ success: true, suspended_until: suspendedUntil });
  }

  if (action === 'reset_password') {
    const userResult = await auth.admin.auth.admin.getUserById(userId);
    if (userResult.error) return jsonError(userResult.error.message, 400);

    const email = userResult.data.user?.email;
    if (!email) return jsonError('Target user has no email for password reset', 400);

    const linkResult = await auth.admin.auth.admin.generateLink({ type: 'recovery', email });
    if (linkResult.error) return jsonError(linkResult.error.message, 400);

    return jsonOk({ success: true, reset_link: linkResult.data.properties?.action_link || null });
  }

  if (action === 'add_note') {
    const note = body?.note?.trim();
    if (!note) return jsonError('note is required', 400);

    const { error } = await auth.admin.from('admin_user_notes').insert({
      target_user_id: userId,
      admin_user_id: auth.user.id,
      note,
    });

    if (error) return jsonError(error.message, 400);
    return jsonOk({ success: true });
  }

  if (action === 'delete_user') {
    if (userId === auth.user.id) return jsonError('You cannot delete yourself', 400);
    if (body?.confirm !== 'DELETE') return jsonError('Explicit DELETE confirmation is required', 400);

    const cleanup = await auth.supabase.rpc('admin_delete_user', { target_user_id: userId });
    if (cleanup.error) return jsonError(cleanup.error.message, 400);

    const deleteResult = await auth.admin.auth.admin.deleteUser(userId);
    if (deleteResult.error) return jsonError(deleteResult.error.message, 400);

    return jsonOk({ success: true });
  }

  return jsonError('Unsupported action', 400);
}
