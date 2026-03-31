import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

type ReportAction = 'dismiss' | 'warn_user' | 'remove_content' | 'suspend_user';

export async function GET(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const status = (url.searchParams.get('status') || 'pending').trim();

  let query = auth.admin
    .from('user_reports')
    .select(
      'id, reporter_id, target_user_id, target_post_id, reason, created_at, admin_status, admin_action, admin_note, resolved_at, resolved_by'
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (status !== 'all') {
    query = query.eq('admin_status', status);
  }

  const { data, error } = await query;
  if (error) return jsonError(error.message, 400);

  return jsonOk({ items: data || [] });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as {
    report_id?: string;
    action?: ReportAction;
    note?: string;
    suspend_days?: number;
  } | null;

  const reportId = body?.report_id?.trim();
  const action = body?.action;

  if (!reportId) return jsonError('report_id is required', 400);
  if (!action) return jsonError('action is required', 400);

  const { data: report, error: reportError } = await auth.admin
    .from('user_reports')
    .select('id, target_user_id, target_post_id')
    .eq('id', reportId)
    .single();

  if (reportError) return jsonError(reportError.message, 400);

  let adminStatus = 'resolved';
  if (action === 'dismiss') adminStatus = 'dismissed';

  if (action === 'remove_content' && report.target_post_id) {
    const updatePost = await auth.admin
      .from('posts')
      .update({ hidden_by_admin: true, visibility_state: 'hidden', moderation_state: 'flagged' })
      .eq('id', report.target_post_id);

    if (updatePost.error) return jsonError(updatePost.error.message, 400);
  }

  if (action === 'suspend_user' && report.target_user_id) {
    const days = Math.max(1, Number(body?.suspend_days || 7));
    const suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const suspendResult = await auth.admin
      .from('profiles')
      .update({ suspended_until: suspendedUntil })
      .eq('id', report.target_user_id);

    if (suspendResult.error) return jsonError(suspendResult.error.message, 400);
  }

  const { error: updateError } = await auth.admin
    .from('user_reports')
    .update({
      admin_status: adminStatus,
      admin_action: action,
      admin_note: body?.note?.trim() || null,
      resolved_at: new Date().toISOString(),
      resolved_by: auth.user.id,
    })
    .eq('id', reportId);

  if (updateError) return jsonError(updateError.message, 400);

  return jsonOk({ success: true });
}
