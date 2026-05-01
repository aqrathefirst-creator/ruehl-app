/**
 * Profile tab grids for `/[username]` — mirrors native `ProfileScreen` tab data paths (read-only).
 */

import type { BadgeVerificationStatus } from '@/lib/ruehl/accountTypes';
import { supabase } from '@/lib/supabase';
import type { RuehlPost } from '@/lib/ruehl/types';
import { isPowrPost, normalizePost } from '@/lib/ruehl/posts';

function rowToRuehlPost(row: Record<string, unknown>): RuehlPost {
  return normalizePost(row) as RuehlPost;
}

function isMissingRelation(err: { message?: string; code?: string } | null): boolean {
  const m = String(err?.message || '').toLowerCase();
  return err?.code === '42P01' || (m.includes('relation') && m.includes('does not exist'));
}

/** Prefer `visible_posts`; fall back to `posts` when the view is absent (local / older DB). */
async function fetchMediaPostsForUser(userId: string, limit: number): Promise<Record<string, unknown>[]> {
  let res = await supabase
    .from('visible_posts')
    .select('*')
    .eq('user_id', userId)
    .not('media_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (res.error && isMissingRelation(res.error)) {
    res = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .not('media_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);
  }
  if (res.error) throw res.error;
  return (res.data as Record<string, unknown>[]) ?? [];
}

/** Recent rows for POWR filtering — cap before client `isPowrPost` (carousel / text rules). */
async function fetchRecentPostsForUser(userId: string, scanLimit: number): Promise<Record<string, unknown>[]> {
  let res = await supabase
    .from('visible_posts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(scanLimit);
  if (res.error && isMissingRelation(res.error)) {
    res = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(scanLimit);
  }
  if (res.error) throw res.error;
  return (res.data as Record<string, unknown>[]) ?? [];
}

/** Posts with primary `media_url` — native Posts tab 3-column grid. */
export async function getMediaPostsByUser(userId: string, limit = 30): Promise<RuehlPost[]> {
  const rows = await fetchMediaPostsForUser(userId, limit);
  return rows.map((r) => rowToRuehlPost(r));
}

const POWR_SCAN_LIMIT = 250;

/** Text-only POWR posts — no primary media and no carousel URLs (`isPowrPost`). */
export async function getPowrPostsByUser(userId: string, limit = 30): Promise<RuehlPost[]> {
  const rows = await fetchRecentPostsForUser(userId, POWR_SCAN_LIMIT);
  const powr = rows.filter((r) => isPowrPost(r));
  return powr.slice(0, limit).map((r) => rowToRuehlPost(r));
}

export type ProfileDropRow = {
  id: string;
  caption: string | null;
  status: string | null;
  scheduled_for: string | null;
  created_at: string | null;
};

export async function getDropsByUser(userId: string, limit = 20): Promise<ProfileDropRow[]> {
  const { data, error } = await supabase
    .from('drops')
    .select('id, caption, status, scheduled_for, created_at')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as ProfileDropRow[];
}

export type LiftedPostForProfile = RuehlPost & {
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  authorBadgeVerificationStatus: BadgeVerificationStatus;
  authorIsVerified: boolean | null;
};

function profileFromPostRow(row: Record<string, unknown>): {
  username: string | null;
  avatarUrl: string | null;
  badge: BadgeVerificationStatus;
  verified: boolean | null;
} {
  const raw = row.profiles;
  const p = Array.isArray(raw) ? raw[0] : raw;
  if (!p || typeof p !== 'object') {
    return { username: null, avatarUrl: null, badge: null, verified: null };
  }
  const o = p as Record<string, unknown>;
  return {
    username: typeof o.username === 'string' ? o.username : null,
    avatarUrl: typeof o.avatar_url === 'string' ? o.avatar_url : null,
    badge: (o.badge_verification_status as BadgeVerificationStatus) ?? null,
    verified: typeof o.is_verified === 'boolean' ? o.is_verified : null,
  };
}

export async function getLiftedPostsByUser(userId: string, limit = 20): Promise<LiftedPostForProfile[]> {
  const { data: lifts, error: liftErr } = await supabase
    .from('post_lifts')
    .select('post_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(120);
  if (liftErr) throw liftErr;
  const ids = [...new Set((lifts || []).map((l: { post_id?: string }) => l.post_id).filter(Boolean))] as string[];
  if (ids.length === 0) return [];
  const slice = ids.slice(0, limit);
  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      profiles (
        username,
        avatar_url,
        badge_verification_status,
        is_verified
      )
    `,
    )
    .in('id', slice);
  if (error) throw error;
  const byId = new Map((data || []).map((r) => [(r as { id: string }).id, r as Record<string, unknown>]));
  return slice
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((raw) => {
      const row = raw as Record<string, unknown>;
      const { profiles: _prof, ...rest } = row;
      const post = rowToRuehlPost(rest);
      const pr = profileFromPostRow(row);
      return {
        ...post,
        authorUsername: pr.username,
        authorAvatarUrl: pr.avatarUrl,
        authorBadgeVerificationStatus: pr.badge,
        authorIsVerified: pr.verified,
      };
    });
}
