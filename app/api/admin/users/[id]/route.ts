import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

type AdminAction = 'verify' | 'shadow_ban' | 'suspend' | 'reset_password' | 'delete_user' | 'add_note';

async function submitGovernanceRequest(params: {
  auth: Awaited<ReturnType<typeof requireAdmin>> & { ok: true };
  subject: string;
  targetId: string;
  notes: string;
}) {
  const { auth, subject, targetId, notes } = params;
  const { error } = await auth.admin.from('admin_requests').insert({
    admin_id: auth.user.id,
    submitted_by: auth.user.id,
    subject,
    target_id: targetId,
    target: targetId,
    notes,
    status: 'pending',
  });

  if (error) {
    throw new Error(error.message || 'Unable to submit request');
  }
}

type ErrorLike = {
  code?: string;
  message?: string;
};

function isMissingRelationError(error: ErrorLike | null | undefined) {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /relation .* does not exist/i.test(error.message || '') ||
    /schema cache/i.test(error.message || '') ||
    /could not find the table/i.test(error.message || '')
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { id } = await params;
  const userId = id?.trim();
  if (!userId) return jsonError('user id is required', 400);

  const [userResult, profileResult, platformUserResult, activityResult, postsResult, reportsResult, notesResult] =
    await Promise.all([
    auth.admin.auth.admin.getUserById(userId),
    auth.admin
      .from('profiles')
      .select(
        'id, username, bio, avatar_url, is_verified, verified, shadow_banned, suspended_until, created_at, account_type, account_category, badge_verification_status',
      )
      .eq('id', userId)
      .maybeSingle(),
    auth.admin.from('users').select('is_admin').eq('id', userId).maybeSingle(),
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
  if (platformUserResult.error) return jsonError(platformUserResult.error.message, 400);
  if (activityResult.error && !isMissingRelationError(activityResult.error)) return jsonError(activityResult.error.message, 400);
  if (postsResult.error && !isMissingRelationError(postsResult.error)) return jsonError(postsResult.error.message, 400);
  if (reportsResult.error && !isMissingRelationError(reportsResult.error)) return jsonError(reportsResult.error.message, 400);
  if (notesResult.error && !isMissingRelationError(notesResult.error)) return jsonError(notesResult.error.message, 400);

  const rawProfile = profileResult.data as Record<string, unknown> | null;
  const mergedProfile = rawProfile
    ? {
        ...rawProfile,
        is_admin: Boolean((platformUserResult.data as { is_admin?: boolean } | null)?.is_admin),
      }
    : null;

  return jsonOk({
    user: userResult.data?.user || null,
    profile: mergedProfile,
    activity: isMissingRelationError(activityResult.error) ? [] : activityResult.data || [],
    posts: isMissingRelationError(postsResult.error) ? [] : postsResult.data || [],
    reports: isMissingRelationError(reportsResult.error) ? [] : reportsResult.data || [],
    notes: isMissingRelationError(notesResult.error) ? [] : notesResult.data || [],
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
    reset_email?: string;
  } | null;

  const action = body?.action;
  if (!action) return jsonError('action is required', 400);

  if (action === 'verify') {
    const next = body?.value === true;
    await submitGovernanceRequest({
      auth,
      subject: 'VERIFY_USER',
      targetId: userId,
      notes: `Requested verification change to ${next ? 'verified' : 'unverified'}.`,
    });
    return jsonOk({ success: true, message: 'Request submitted for approval' });
  }

  if (action === 'shadow_ban') {
    const next = body?.value === true;
    await submitGovernanceRequest({
      auth,
      subject: 'SHADOW_BAN_USER',
      targetId: userId,
      notes: `Requested shadow ban change to ${next ? 'enabled' : 'disabled'}.`,
    });
    return jsonOk({ success: true, message: 'Request submitted for approval' });
  }

  if (action === 'suspend') {
    const days = Math.max(0, Number(body?.days || 0));
    await submitGovernanceRequest({
      auth,
      subject: 'RESTRICT_USER',
      targetId: userId,
      notes: `Requested restriction for ${days} day(s).`,
    });
    return jsonOk({ success: true, message: 'Request submitted for approval' });
  }

  if (action === 'reset_password') {
    const email = body?.reset_email?.trim().toLowerCase() || 'account-email-on-file';
    await submitGovernanceRequest({
      auth,
      subject: 'SECURITY_CHANGE',
      targetId: userId,
      notes: `Requested password reset/security update for ${email}.`,
    });
    return jsonOk({ success: true, message: 'Request submitted for approval' });
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

    await submitGovernanceRequest({
      auth,
      subject: 'DELETE_USER',
      targetId: userId,
      notes: 'Requested account deletion from user detail panel.',
    });

    return jsonOk({ success: true, message: 'Request submitted for approval' });
  }

  return jsonError('Unsupported action', 400);
}
