import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

type ContentAction = 'delete' | 'hide' | 'restrict' | 'mark_safe';

export async function GET(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const filter = (url.searchParams.get('filter') || 'all').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get('pageSize') || '25')));
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  let query = auth.admin
    .from('posts')
    .select('id, user_id, content, media_url, created_at, hidden_by_admin, discovery_disabled, moderation_state, visibility_state, boosted_until, trending_override', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(start, end);

  if (filter === 'reported') {
    const { data: reportRows, error: reportError } = await auth.admin
      .from('user_reports')
      .select('target_post_id')
      .not('target_post_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500);

    if (reportError) return jsonError(reportError.message, 400);

    const ids = Array.from(new Set((reportRows || []).map((row) => row.target_post_id).filter(Boolean)));
    if (ids.length === 0) return jsonOk({ items: [], pagination: { page, pageSize, total: 0, totalPages: 1 } });
    query = auth.admin
      .from('posts')
      .select('id, user_id, content, media_url, created_at, hidden_by_admin, discovery_disabled, moderation_state, visibility_state, boosted_until, trending_override', {
        count: 'exact',
      })
      .in('id', ids)
      .order('created_at', { ascending: false })
      .range(start, end);
  }

  if (filter === 'flagged') {
    query = query.or('moderation_state.eq.flagged,hidden_by_admin.eq.true,visibility_state.eq.restricted');
  }

  if (filter === 'trending') {
    query = query.eq('trending_override', true);
  }

  const { data, error, count } = await query;
  if (error) return jsonError(error.message, 400);

  return jsonOk({
    items: data || [],
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as {
    post_id?: string;
    action?: ContentAction;
  } | null;

  const postId = body?.post_id?.trim();
  const action = body?.action;

  if (!postId) return jsonError('post_id is required', 400);
  if (!action) return jsonError('action is required', 400);

  if (action === 'delete') {
    const { error } = await auth.admin.from('posts').delete().eq('id', postId);
    if (error) return jsonError(error.message, 400);
    return jsonOk({ success: true });
  }

  if (action === 'hide') {
    const { error } = await auth.admin
      .from('posts')
      .update({ hidden_by_admin: true, moderation_state: 'flagged', visibility_state: 'hidden' })
      .eq('id', postId);
    if (error) return jsonError(error.message, 400);
    return jsonOk({ success: true });
  }

  if (action === 'restrict') {
    const { error } = await auth.admin
      .from('posts')
      .update({ discovery_disabled: true, moderation_state: 'flagged', visibility_state: 'restricted' })
      .eq('id', postId);
    if (error) return jsonError(error.message, 400);
    return jsonOk({ success: true });
  }

  if (action === 'mark_safe') {
    const { error } = await auth.admin
      .from('posts')
      .update({
        hidden_by_admin: false,
        discovery_disabled: false,
        moderation_state: 'safe',
        visibility_state: 'normal',
      })
      .eq('id', postId);

    if (error) return jsonError(error.message, 400);
    return jsonOk({ success: true });
  }

  return jsonError('Unsupported action', 400);
}
