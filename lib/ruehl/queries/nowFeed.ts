/**
 * NOW feed for `/` — posts + drops from followed users, self, and tuned-in creators.
 * Chronological merge for Path D v1 (no algorithmic ranking).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { RuehlPost, RuehlProfile } from '@/lib/ruehl/types';
import { normalizePost } from '@/lib/ruehl/posts';
import { getProfile } from '@/lib/ruehl/queries/profile';
import { primaryMediaUrls } from '@/lib/ruehl/postMedia';

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

async function loadMutualBlockUserIds(client: SupabaseClient, viewerId: string): Promise<Set<string>> {
  const hide = new Set<string>();
  const [a, b] = await Promise.all([
    client.from('blocked_users').select('blocked_id').eq('blocker_id', viewerId),
    client.from('blocked_users').select('blocker_id').eq('blocked_id', viewerId),
  ]);
  if (!a.error) {
    for (const r of a.data || []) {
      if ((r as { blocked_id?: string }).blocked_id) hide.add(String((r as { blocked_id: string }).blocked_id));
    }
  }
  if (!b.error) {
    for (const r of b.data || []) {
      if ((r as { blocker_id?: string }).blocker_id) hide.add(String((r as { blocker_id: string }).blocker_id));
    }
  }
  return hide;
}

async function loadTuneCreatorIds(client: SupabaseClient, viewerId: string): Promise<string[]> {
  const ids = new Set<string>();

  const ti = await client.from('tune_ins').select('creator_id').eq('tuner_id', viewerId);
  if (!ti.error) {
    for (const r of ti.data || []) {
      const c = (r as { creator_id?: string }).creator_id;
      if (c) ids.add(String(c));
    }
  }

  const legacy = await client.from('drop_tune_ins').select('creator_id').eq('user_id', viewerId);
  if (!legacy.error) {
    for (const r of legacy.data || []) {
      const c = (r as { creator_id?: string }).creator_id;
      if (c) ids.add(String(c));
    }
  }

  return [...ids];
}

export type NowFeedDropCard = {
  id: string;
  creator_id: string;
  caption: string | null;
  status: string | null;
  duration_seconds: number | null;
  created_at: string | null;
  scheduled_for: string | null;
};

export type NowFeedItem =
  | {
      type: 'post';
      id: string;
      created_at: string;
      post: RuehlPost;
      author: RuehlProfile | null;
      commentCount: number;
    }
  | {
      type: 'drop';
      id: string;
      created_at: string;
      drop: NowFeedDropCard;
      author: RuehlProfile | null;
    };

async function collectSourceUserIds(client: SupabaseClient, viewerId: string): Promise<string[]> {
  const ids = new Set<string>();
  ids.add(viewerId);

  const follows = await client.from('follows').select('following_id').eq('follower_id', viewerId);
  if (follows.error) throw follows.error;
  for (const r of follows.data || []) {
    const id = (r as { following_id?: string }).following_id;
    if (id) ids.add(String(id));
  }

  for (const c of await loadTuneCreatorIds(client, viewerId)) {
    ids.add(c);
  }

  return [...ids];
}

function mergeAndSlice(
  postRows: Record<string, unknown>[],
  dropRows: Record<string, unknown>[],
  offset: number,
  limit: number,
): Array<{ kind: 'post' | 'drop'; row: Record<string, unknown>; created_at: string }> {
  const items: Array<{ kind: 'post' | 'drop'; row: Record<string, unknown>; created_at: string }> = [];

  for (const row of postRows) {
    const ca = row.created_at == null ? '' : String(row.created_at);
    const t = ca ? new Date(ca).getTime() : 0;
    items.push({ kind: 'post', row, created_at: Number.isFinite(t) ? ca : '' });
  }
  for (const row of dropRows) {
    const ca = row.created_at == null ? '' : String(row.created_at);
    const t = ca ? new Date(ca).getTime() : 0;
    items.push({ kind: 'drop', row, created_at: Number.isFinite(t) ? ca : '' });
  }

  items.sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });

  return items.slice(offset, offset + limit);
}

export async function getNowFeed(
  userId: string,
  offset: number,
  limit: number,
  client: SupabaseClient,
): Promise<NowFeedItem[]> {
  const viewerId = String(userId || '').trim();
  if (!viewerId) return [];

  const sourceIds = await collectSourceUserIds(client, viewerId);
  const blocked = await loadMutualBlockUserIds(client, viewerId);

  const filteredSource = sourceIds.filter((id) => !blocked.has(id));
  if (filteredSource.length === 0) return [];

  const pool = Math.min(500, Math.max(offset + limit + 100, 150));

  let postRows: Record<string, unknown>[] = [];
  const vp = await client
    .from('visible_posts')
    .select('*')
    .in('user_id', filteredSource)
    .order('created_at', { ascending: false })
    .limit(pool);

  if (vp.error) {
    if (isMissingRelation(vp.error)) {
      const p = await client
        .from('posts')
        .select('*')
        .in('user_id', filteredSource)
        .order('created_at', { ascending: false })
        .limit(pool);
      if (p.error) throw p.error;
      postRows = ((p.data || []) as Record<string, unknown>[]).filter(isPostRowVisible);
    } else {
      throw vp.error;
    }
  } else {
    postRows = ((vp.data || []) as Record<string, unknown>[]).filter(isPostRowVisible);
  }

  postRows = postRows.filter((r) => !blocked.has(String(r.user_id || '')));

  const dropsRes = await client
    .from('drops')
    .select('id, creator_id, caption, status, duration_seconds, created_at, scheduled_for, hidden')
    .in('creator_id', filteredSource)
    .order('created_at', { ascending: false })
    .limit(pool);

  if (dropsRes.error) throw dropsRes.error;

  let dropRows = ((dropsRes.data || []) as Record<string, unknown>[]).filter((r) => {
    if (blocked.has(String(r.creator_id || ''))) return false;
    if (r.hidden === true) return false;
    return true;
  });

  const merged = mergeAndSlice(postRows, dropRows, offset, limit);

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

/** First primary media URL for feed thumbnail (same strategy as FeedCard). */
export function nowFeedPrimaryMediaUrl(post: RuehlPost): string {
  const urls = primaryMediaUrls(post);
  return urls[0] || String(post.media_url || '').trim();
}
