/**
 * Saved posts library for `/saved` — read-only consumption (saves happen in native app per Path D).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { RuehlPost } from '@/lib/ruehl/types';
import { normalizePost } from '@/lib/ruehl/posts';
import { getProfile } from '@/lib/ruehl/queries/profile';
import type { NowFeedItem } from '@/lib/ruehl/queries/nowFeed';

export type SavedFeedItem = Extract<NowFeedItem, { type: 'post' }>;

function isPostRowVisible(row: Record<string, unknown>): boolean {
  if (row.hidden_by_admin === true) return false;
  const vs = row.visibility_state;
  if (vs === 'hidden' || vs === 'removed') return false;
  return true;
}

/**
 * Paginated saved posts for the current user, newest saves first.
 * Skips rows whose post is missing or not visible.
 */
export async function getSavedItems(
  userId: string,
  offset: number,
  limit: number,
  client: SupabaseClient,
): Promise<SavedFeedItem[]> {
  const uid = String(userId || '').trim();
  if (!uid) return [];

  const safeOffset = Math.max(0, Math.floor(offset));
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
  const from = safeOffset;
  const to = safeOffset + safeLimit - 1;

  const { data: rows, error } = await client
    .from('saved_posts')
    .select(
      `
      created_at,
      post_id,
      post:posts (*)
    `,
    )
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  type Row = {
    created_at: string;
    post_id: string;
    post: Record<string, unknown> | Record<string, unknown>[] | null;
  };

  const list = (rows || []) as Row[];

  const pairs: { savedAt: string; row: Record<string, unknown> }[] = [];
  for (const r of list) {
    const p = r.post;
    const postObj = Array.isArray(p) ? p[0] : p;
    if (!postObj || typeof postObj !== 'object') continue;
    if (!isPostRowVisible(postObj as Record<string, unknown>)) continue;
    pairs.push({ savedAt: r.created_at, row: postObj as Record<string, unknown> });
  }

  const postIds = pairs.map((x) => String(x.row.id ?? '')).filter(Boolean);
  const commentCountByPost = new Map<string, number>();
  if (postIds.length > 0) {
    const { data: commentRows } = await client.from('comments').select('post_id').in('post_id', postIds);
    for (const c of commentRows || []) {
      const pid = String((c as { post_id?: string }).post_id ?? '');
      if (!pid) continue;
      commentCountByPost.set(pid, (commentCountByPost.get(pid) || 0) + 1);
    }
  }

  const authorIds = [...new Set(pairs.map((x) => String(x.row.user_id ?? '')).filter(Boolean))];
  const authorById = new Map<string, Awaited<ReturnType<typeof getProfile>>>();
  await Promise.all(
    authorIds.map(async (id) => {
      const p = await getProfile(id, client).catch(() => null);
      authorById.set(id, p);
    }),
  );

  const out: SavedFeedItem[] = [];
  for (const { savedAt, row } of pairs) {
    const post = normalizePost(row) as RuehlPost;
    const aid = String(row.user_id || '');
    const commentCount = commentCountByPost.get(post.id) ?? 0;
    out.push({
      type: 'post',
      id: post.id,
      created_at: savedAt,
      post,
      author: authorById.get(aid) ?? null,
      commentCount,
    });
  }

  return out;
}
