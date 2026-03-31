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

  const patch: Record<string, unknown> = {};

  if (action === 'boost') {
    const hours = Math.max(1, Number(body?.boost_hours || 24));
    patch.boosted_until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    patch.visibility_state = 'normal';
  }

  if (action === 'remove_discovery') {
    patch.discovery_disabled = true;
    patch.visibility_state = 'restricted';
  }

  if (action === 'restore_discovery') {
    patch.discovery_disabled = false;
    patch.visibility_state = 'normal';
  }

  if (action === 'override_trending') {
    patch.trending_override = true;
  }

  if (action === 'clear_override') {
    patch.trending_override = false;
    patch.boosted_until = null;
  }

  const { error } = await auth.admin.from('posts').update(patch).eq('id', postId);
  if (error) return jsonError(error.message, 400);

  return jsonOk({ success: true });
}
