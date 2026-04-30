import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

/** Legacy UI actions → DB `report_action` enum (`apply_report_action`). */
type ReportAction = 'dismiss' | 'warn_user' | 'remove_content' | 'suspend_user';

const TARGET_TYPES = new Set(['post', 'drop', 'comment', 'message', 'user']);

function mapActionToRpc(action: ReportAction): {
  p_action: 'none' | 'user_warned' | 'content_hidden' | 'user_suspended';
  p_resolution_status: 'dismissed' | 'resolved_action_taken';
} {
  switch (action) {
    case 'dismiss':
      return { p_action: 'none', p_resolution_status: 'dismissed' };
    case 'warn_user':
      return { p_action: 'user_warned', p_resolution_status: 'resolved_action_taken' };
    case 'remove_content':
      return { p_action: 'content_hidden', p_resolution_status: 'resolved_action_taken' };
    case 'suspend_user':
      return { p_action: 'user_suspended', p_resolution_status: 'resolved_action_taken' };
  }
}

/**
 * GET: `list_admin_reports(p_filter_type, p_limit)` — returns only rows with status ∈ (open, in_review).
 * Query `status=all` does not expand history; resolved reports are not exposed by this RPC.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const targetType = (url.searchParams.get('target_type') || '').trim().toLowerCase();
  const p_filter_type =
    targetType && TARGET_TYPES.has(targetType)
      ? (targetType as 'post' | 'drop' | 'comment' | 'message' | 'user')
      : null;

  const { data, error } = await auth.supabase.rpc('list_admin_reports', {
    p_filter_type,
    p_limit: 200,
  });

  if (error) return jsonError(error.message, 400);

  return jsonOk({ items: data ?? [] });
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

  const { p_action, p_resolution_status } = mapActionToRpc(action);

  const { data, error } = await auth.supabase.rpc('apply_report_action', {
    p_report_id: reportId,
    p_action,
    p_resolution_status,
  });

  if (error) return jsonError(error.message, 400);
  if (data === false) return jsonError('Action failed', 400);

  return jsonOk({ success: true });
}
