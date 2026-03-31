import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

type ContentAction =
  | 'delete'
  | 'hide'
  | 'restrict'
  | 'mark_safe'
  | 'flag_manual'
  | 'set_visibility'
  | 'boost'
  | 'remove_discovery'
  | 'reduce_reach'
  | 'force_now_feed'
  | 'clear_override';

type VisibilityState = 'normal' | 'restricted' | 'hidden' | 'removed';

type ErrorLike = {
  code?: string;
  message?: string;
};

const AUTO_FLAG_KEYWORDS = ['scam', 'fraud', 'fake', 'hate', 'violence', 'terror', 'abuse', 'self-harm'];

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

function detectAutoFlags(content: string | null | undefined, hashtags: string[] | null | undefined) {
  const source = `${content || ''} ${(hashtags || []).join(' ')}`.toLowerCase();
  const matched = AUTO_FLAG_KEYWORDS.filter((keyword) => source.includes(keyword));
  return {
    auto_flagged: matched.length > 0,
    auto_flag_keywords: matched,
  };
}

async function writeContentAudit(
  auth: Awaited<ReturnType<typeof requireAdmin>> & { ok: true },
  postId: string,
  action: ContentAction,
  details: Record<string, unknown> = {}
) {
  const { error } = await auth.admin.from('admin_content_actions').insert({
    post_id: postId,
    admin_user_id: auth.user.id,
    action,
    details,
  });

  if (error && !isMissingRelationError(error)) {
    throw new Error(error.message || 'Unable to write content audit event');
  }
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const postId = url.searchParams.get('postId')?.trim();

  if (postId) {
    const { data: post, error: postError } = await auth.admin
      .from('posts')
      .select('id, user_id, content, media_url, thumbnail_url, genre, hashtags, created_at, hidden_by_admin, discovery_disabled, moderation_state, visibility_state, boosted_until, trending_override')
      .eq('id', postId)
      .maybeSingle();

    if (postError) return jsonError(postError.message, 400);
    if (!post) return jsonError('Post not found', 404);

    const [{ data: profile }, likesResult, commentsResult, reportsResult, actionsResult] = await Promise.all([
      auth.admin
        .from('profiles')
        .select('id, username, avatar_url, shadow_banned')
        .eq('id', post.user_id)
        .maybeSingle(),
      auth.admin.from('likes').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
      auth.admin.from('comments').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
      auth.admin
        .from('user_reports')
        .select('id, reporter_id, reason, created_at, admin_status')
        .eq('target_post_id', post.id)
        .order('created_at', { ascending: false })
        .limit(100),
      auth.admin
        .from('admin_content_actions')
        .select('id, admin_user_id, action, details, created_at')
        .eq('post_id', post.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (likesResult.error) return jsonError(likesResult.error.message, 400);
    if (commentsResult.error) return jsonError(commentsResult.error.message, 400);
    if (reportsResult.error && !isMissingRelationError(reportsResult.error)) return jsonError(reportsResult.error.message, 400);
    if (actionsResult.error && !isMissingRelationError(actionsResult.error)) return jsonError(actionsResult.error.message, 400);

    const reportRows = isMissingRelationError(reportsResult.error) ? [] : reportsResult.data || [];
    const reporterIds = Array.from(new Set(reportRows.map((row) => row.reporter_id).filter(Boolean)));
    const reporterProfiles = reporterIds.length
      ? await auth.admin.from('profiles').select('id, username').in('id', reporterIds)
      : { data: [], error: null };

    if (reporterProfiles.error) return jsonError(reporterProfiles.error.message, 400);

    const reporterMap = new Map((reporterProfiles.data || []).map((row) => [row.id, row.username]));
    const reportReasons = reportRows.reduce<Record<string, number>>((acc, row) => {
      const reason = row.reason || 'Unspecified';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});

    const autoFlag = detectAutoFlags(post.content, (post.hashtags as string[] | null | undefined) || []);
    const pendingReports = reportRows.filter((row) => (row.admin_status || 'pending') === 'pending').length;

    return jsonOk({
      post: {
        ...post,
        username: profile?.username || null,
        avatar_url: profile?.avatar_url || null,
        shadow_banned: profile?.shadow_banned ?? false,
        engagement: {
          likes: likesResult.count || 0,
          comments: commentsResult.count || 0,
          shares: null,
        },
        reports: {
          total: reportRows.length,
          pending: pendingReports,
          reasons: reportReasons,
          reporters: reportRows.map((row) => ({
            id: row.reporter_id,
            username: reporterMap.get(row.reporter_id) || 'Unknown',
            reason: row.reason,
            created_at: row.created_at,
            status: row.admin_status || 'pending',
          })),
        },
        auto_flagged: autoFlag.auto_flagged,
        auto_flag_keywords: autoFlag.auto_flag_keywords,
      },
      actions: isMissingRelationError(actionsResult.error) ? [] : actionsResult.data || [],
    });
  }

  const filter = (url.searchParams.get('filter') || 'all').trim();
  const sort = (url.searchParams.get('sort') || 'recent').trim();
  const genre = (url.searchParams.get('genre') || '').trim();
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get('pageSize') || '25')));
  const fetchLimit = Math.max(200, Math.min(800, page * pageSize * 8));

  const { data: posts, error: postsError } = await auth.admin
    .from('posts')
    .select('id, user_id, content, media_url, thumbnail_url, genre, hashtags, created_at, hidden_by_admin, discovery_disabled, moderation_state, visibility_state, boosted_until, trending_override')
    .order('created_at', { ascending: false })
    .limit(fetchLimit);

  if (postsError) return jsonError(postsError.message, 400);

  const postRows = posts || [];
  if (postRows.length === 0) {
    return jsonOk({ items: [], pagination: { page, pageSize, total: 0, totalPages: 1 } });
  }

  const postIds = postRows.map((post) => post.id);
  const userIds = Array.from(new Set(postRows.map((post) => post.user_id)));

  const [profilesResult, likesResult, commentsResult, reportsResult] = await Promise.all([
    auth.admin.from('profiles').select('id, username, avatar_url, shadow_banned').in('id', userIds),
    auth.admin.from('likes').select('post_id').in('post_id', postIds),
    auth.admin.from('comments').select('post_id').in('post_id', postIds),
    auth.admin
      .from('user_reports')
      .select('target_post_id, reason, admin_status')
      .in('target_post_id', postIds),
  ]);

  if (profilesResult.error) return jsonError(profilesResult.error.message, 400);
  if (likesResult.error) return jsonError(likesResult.error.message, 400);
  if (commentsResult.error) return jsonError(commentsResult.error.message, 400);
  if (reportsResult.error && !isMissingRelationError(reportsResult.error)) return jsonError(reportsResult.error.message, 400);

  const profileMap = new Map((profilesResult.data || []).map((profile) => [profile.id, profile]));
  const likesCountMap = new Map<string, number>();
  const commentsCountMap = new Map<string, number>();
  const reportCountMap = new Map<string, number>();
  const reportPendingMap = new Map<string, number>();

  for (const row of likesResult.data || []) {
    likesCountMap.set(row.post_id, (likesCountMap.get(row.post_id) || 0) + 1);
  }

  for (const row of commentsResult.data || []) {
    commentsCountMap.set(row.post_id, (commentsCountMap.get(row.post_id) || 0) + 1);
  }

  for (const row of isMissingRelationError(reportsResult.error) ? [] : reportsResult.data || []) {
    const postKey = row.target_post_id;
    if (!postKey) continue;
    reportCountMap.set(postKey, (reportCountMap.get(postKey) || 0) + 1);
    if ((row.admin_status || 'pending') === 'pending') {
      reportPendingMap.set(postKey, (reportPendingMap.get(postKey) || 0) + 1);
    }
  }

  const enriched = postRows.map((post) => {
    const profile = profileMap.get(post.user_id);
    const likes = likesCountMap.get(post.id) || 0;
    const comments = commentsCountMap.get(post.id) || 0;
    const reports = reportCountMap.get(post.id) || 0;
    const pendingReports = reportPendingMap.get(post.id) || 0;
    const autoFlag = detectAutoFlags(post.content, (post.hashtags as string[] | null | undefined) || []);

    const state = (post.visibility_state as VisibilityState | null) || 'normal';
    const status =
      state === 'removed'
        ? 'removed'
        : post.hidden_by_admin || state === 'hidden'
          ? 'hidden'
          : post.discovery_disabled || state === 'restricted'
            ? 'restricted'
            : post.moderation_state === 'flagged' || autoFlag.auto_flagged || pendingReports > 0
              ? 'flagged'
              : 'normal';

    return {
      ...post,
      username: profile?.username || null,
      avatar_url: profile?.avatar_url || null,
      shadow_banned: profile?.shadow_banned ?? false,
      report_count: reports,
      pending_report_count: pendingReports,
      engagement: {
        likes,
        comments,
        shares: null,
      },
      status,
      auto_flagged: autoFlag.auto_flagged,
      auto_flag_keywords: autoFlag.auto_flag_keywords,
    };
  });

  const filtered = enriched.filter((item) => {
    if (genre && (item.genre || '').toLowerCase() !== genre.toLowerCase()) return false;

    if (filter === 'reported') return item.report_count > 0;
    if (filter === 'flagged') return item.status === 'flagged' || item.auto_flagged;
    if (filter === 'shadow_banned') return item.shadow_banned === true;
    if (filter === 'restricted') return item.visibility_state === 'restricted' || item.discovery_disabled === true;
    if (filter === 'hidden') return item.visibility_state === 'hidden' || item.hidden_by_admin === true;
    if (filter === 'removed') return item.visibility_state === 'removed';

    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'engaged') {
      const scoreA = (a.engagement.likes || 0) + (a.engagement.comments || 0);
      const scoreB = (b.engagement.likes || 0) + (b.engagement.comments || 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
    }

    if (sort === 'reported') {
      if ((b.report_count || 0) !== (a.report_count || 0)) return (b.report_count || 0) - (a.report_count || 0);
    }

    return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
  });

  const total = sorted.length;
  const start = (page - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize);

  return jsonOk({
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as {
    post_id?: string;
    action?: ContentAction;
    visibility_state?: VisibilityState;
    note?: string;
  } | null;

  const postId = body?.post_id?.trim();
  const action = body?.action;

  if (!postId) return jsonError('post_id is required', 400);
  if (!action) return jsonError('action is required', 400);

  const { data: beforePost, error: beforeError } = await auth.admin
    .from('posts')
    .select('id, visibility_state, moderation_state, discovery_disabled, hidden_by_admin, trending_override, boosted_until')
    .eq('id', postId)
    .maybeSingle();

  if (beforeError) return jsonError(beforeError.message, 400);
  if (!beforePost) return jsonError('Post not found', 404);

  const patch: Record<string, unknown> = {};

  if (action === 'delete') {
    await writeContentAudit(auth, postId, action, { note: body?.note || null, before: beforePost });
    const { error } = await auth.admin.from('posts').delete().eq('id', postId);
    if (error) return jsonError(error.message, 400);
    return jsonOk({ success: true });
  }

  if (action === 'hide') {
    patch.hidden_by_admin = true;
    patch.moderation_state = 'flagged';
    patch.visibility_state = 'hidden';
  }

  if (action === 'restrict') {
    patch.discovery_disabled = true;
    patch.moderation_state = 'flagged';
    patch.visibility_state = 'restricted';
  }

  if (action === 'mark_safe') {
    patch.hidden_by_admin = false;
    patch.discovery_disabled = false;
    patch.moderation_state = 'safe';
    patch.visibility_state = 'normal';

    const markReports = await auth.admin
      .from('user_reports')
      .update({
        admin_status: 'resolved',
        admin_action: 'mark_safe',
        resolved_at: new Date().toISOString(),
        resolved_by: auth.user.id,
      })
      .eq('target_post_id', postId)
      .eq('admin_status', 'pending');

    if (markReports.error && !isMissingRelationError(markReports.error)) {
      return jsonError(markReports.error.message, 400);
    }
  }

  if (action === 'flag_manual') {
    patch.moderation_state = 'flagged';
  }

  if (action === 'set_visibility') {
    const nextState = body?.visibility_state;
    if (!nextState) return jsonError('visibility_state is required', 400);
    patch.visibility_state = nextState;

    if (nextState === 'normal') {
      patch.hidden_by_admin = false;
      patch.discovery_disabled = false;
    }

    if (nextState === 'restricted') {
      patch.discovery_disabled = true;
      patch.hidden_by_admin = false;
    }

    if (nextState === 'hidden') {
      patch.hidden_by_admin = true;
    }

    if (nextState === 'removed') {
      patch.hidden_by_admin = true;
      patch.discovery_disabled = true;
      patch.moderation_state = 'flagged';
    }
  }

  if (action === 'boost') {
    patch.boosted_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    patch.trending_override = true;
    patch.visibility_state = 'normal';
    patch.discovery_disabled = false;
    patch.hidden_by_admin = false;
  }

  if (action === 'remove_discovery') {
    patch.discovery_disabled = true;
  }

  if (action === 'reduce_reach') {
    patch.discovery_disabled = true;
    patch.visibility_state = 'restricted';
  }

  if (action === 'force_now_feed') {
    patch.trending_override = true;
    patch.boosted_until = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  }

  if (action === 'clear_override') {
    patch.trending_override = false;
    patch.boosted_until = null;
  }

  if (Object.keys(patch).length === 0) {
    return jsonError('Unsupported action', 400);
  }

  const { data: updated, error } = await auth.admin
    .from('posts')
    .update(patch)
    .eq('id', postId)
    .select('id, visibility_state, moderation_state, discovery_disabled, hidden_by_admin, trending_override, boosted_until')
    .single();

  if (error) return jsonError(error.message, 400);

  await writeContentAudit(auth, postId, action, {
    note: body?.note || null,
    before: beforePost,
    after: updated,
  });

  return jsonOk({ success: true, post: updated });
}
