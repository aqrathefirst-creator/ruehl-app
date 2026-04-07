import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

type FeedAction = 'boost' | 'remove_discovery' | 'restore_discovery' | 'override_trending' | 'clear_override';

export async function GET(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { data, error } = await auth.admin
    .from('posts')
    .select('id, user_id, content, created_at, boosted_until, discovery_disabled, trending_override, visibility_state')
    .order('created_at', { ascending: false })
    .limit(120);

  if (error) return jsonError(error.message, 400);
  return jsonOk({ items: data || [] });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as {
    post_id?: string;
    action?: FeedAction;
    boost_hours?: number;
  } | null;

  const postId = body?.post_id?.trim();
  const action = body?.action;

  if (!postId) return jsonError('post_id is required', 400);
  if (!action) return jsonError('action is required', 400);

  const subjectByAction: Record<FeedAction, string> = {
    boost: 'BOOST_PROMOTE_CONTENT',
    remove_discovery: 'REMOVE_DISCOVERY',
    restore_discovery: 'REMOVE_DISCOVERY',
    override_trending: 'OVERRIDE_CHART',
    clear_override: 'OTHER',
  };

  const notes = [
    `Feed control action requested: ${action}`,
    body?.boost_hours ? `boost_hours=${body.boost_hours}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const { error } = await auth.admin.from('admin_requests').insert({
    admin_id: auth.user.id,
    submitted_by: auth.user.id,
    subject: subjectByAction[action],
    target_id: postId,
    target: postId,
    notes,
    status: 'pending',
  });
  if (error) return jsonError(error.message, 400);

  return jsonOk({ success: true, message: 'Request submitted for approval' });
}
