/**
 * Explore feed — global trending-ish merge (posts + drops), no follow graph.
 * Sort: lifts proxy on posts, drops use score 0; then recency (14-day window).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { RuehlPost, RuehlProfile } from '@/lib/ruehl/types';
import { normalizePost } from '@/lib/ruehl/posts';
import { getProfile } from '@/lib/ruehl/queries/profile';
import type { NowFeedDropCard, NowFeedItem } from '@/lib/ruehl/queries/nowFeed';

function isMissingRelation(err: { message?: string; code?: string } | null): boolean {
  const m = String(err?.message || '').toLowerCase();
  return err?.code === '42P01' || (m.includes('relation') && m.includes('does not exist'));
}

function isPostRowVisible(row: Record<string, unknown>): boolean {
  if (row.hidden_by_admin === true) return false;
  const vs = row.visibility_state;
  if (vs === 'hidden' || vs === 'removed') return false;
  return true;
}

function postLiftScore(row: Record<string, unknown>): number {
  const n = normalizePost(row);
  return Number.isFinite(n.liftCount) ? n.liftCount : 0;
}

function mergeTrendingSlice(
  postRows: Record<string, unknown>[],
  dropRows: Record<string, unknown>[],
  offset: number,
  limit: number,
): Array<{ kind: 'post' | 'drop'; row: Record<string, unknown>; created_at: string; score: number }> {
  const items: Array<{ kind: 'post' | 'drop'; row: Record<string, unknown>; created_at: string; score: number }> = [];

  for (const row of postRows) {
    const ca = row.created_at == null ? '' : String(row.created_at);
    const t = ca ? new Date(ca).getTime() : 0;
    items.push({
      kind: 'post',
      row,
      created_at: Number.isFinite(t) ? ca : '',
      score: postLiftScore(row),
    });
  }
  for (const row of dropRows) {
    const ca = row.created_at == null ? '' : String(row.created_at);
    const t = ca ? new Date(ca).getTime() : 0;
    items.push({
      kind: 'drop',
      row,
      created_at: Number.isFinite(t) ? ca : '',
      score: 0,
    });
  }

  items.sort((a, b) => {
    const d = b.score - a.score;
    if (d !== 0) return d;
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });

  return items.slice(offset, offset + limit);
}

export async function getExploreFeed(
  offset: number,
  limit: number,
  client: SupabaseClient,
): Promise<NowFeedItem[]> {
  const poolSize = Math.min(500, Math.max(offset + limit + 80, Math.max(limit * 4, 80)));
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  let postRows: Record<string, unknown>[] = [];
  const vp = await client
    .from('visible_posts')
    .select('*')
    .gte('created_at', fourteenDaysAgo)
    .order('created_at', { ascending: false })
    .limit(poolSize);

  if (vp.error) {
    if (isMissingRelation(vp.error)) {
      const p = await client
        .from('posts')
        .select('*')
        .gte('created_at', fourteenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(poolSize);
      if (p.error) throw p.error;
      postRows = ((p.data || []) as Record<string, unknown>[]).filter(isPostRowVisible);
    } else {
      throw vp.error;
    }
  } else {
    postRows = ((vp.data || []) as Record<string, unknown>[]).filter(isPostRowVisible);
  }

  const dropsRes = await client
    .from('drops')
    .select('id, creator_id, caption, status, duration_seconds, created_at, scheduled_for, hidden')
    .gte('created_at', fourteenDaysAgo)
    .order('created_at', { ascending: false })
    .limit(poolSize);

  if (dropsRes.error) throw dropsRes.error;

  const dropRows = ((dropsRes.data || []) as Record<string, unknown>[]).filter((r) => r.hidden !== true);

  const merged = mergeTrendingSlice(postRows, dropRows, offset, limit);

  const userIdsNeedProfile = new Set<string>();
  for (const m of merged) {
    if (m.kind === 'post') userIdsNeedProfile.add(String(m.row.user_id || ''));
    else userIdsNeedProfile.add(String(m.row.creator_id || ''));
  }
  userIdsNeedProfile.delete('');

  const profileById = new Map<string, RuehlProfile | null>();
  await Promise.all(
    [...userIdsNeedProfile].map(async (uid) => {
      const p = await getProfile(uid, client);
      profileById.set(uid, p);
    }),
  );

  const out: NowFeedItem[] = [];

  for (const m of merged) {
    if (m.kind === 'post') {
      const row = m.row;
      const uid = String(row.user_id || '');
      const post = normalizePost(row) as RuehlPost;
      const cc = Number((row as Record<string, unknown>).comments_count ?? 0);
      const commentCount = Number.isFinite(cc) ? Math.max(0, Math.floor(cc)) : 0;
      out.push({
        type: 'post',
        id: post.id,
        created_at: m.created_at || post.created_at || '',
        post,
        author: profileById.get(uid) ?? null,
        commentCount,
      });
    } else {
      const row = m.row;
      const uid = String(row.creator_id || '');
      const drop: NowFeedDropCard = {
        id: String(row.id),
        creator_id: uid,
        caption: row.caption == null ? null : String(row.caption),
        status: row.status == null ? null : String(row.status),
        duration_seconds:
          row.duration_seconds == null ? null : Number(row.duration_seconds),
        created_at: row.created_at == null ? null : String(row.created_at),
        scheduled_for: row.scheduled_for == null ? null : String(row.scheduled_for),
      };
      out.push({
        type: 'drop',
        id: drop.id,
        created_at: m.created_at || drop.created_at || '',
        drop,
        author: profileById.get(uid) ?? null,
      });
    }
  }

  return out;
}
