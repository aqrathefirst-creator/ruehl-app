/**
 * Home / explore feed and right-rail data — client `supabase` only, defensive (no throw to UI).
 * Uses `posts` denormalized music fields + `licensed_tracks` for artwork; avoids legacy `sounds` table column lists.
 */

import { supabase } from '@/lib/supabase';
import type { RuehlPost, RuehlProfile } from '@/lib/ruehl/types';
import { normalizePost, resolvePostSound, type PostSoundInput } from '@/lib/ruehl/posts';
import type { AccountCategory, AccountType, BadgeVerificationStatus } from '@/lib/ruehl/accountTypes';
import {
  buildCreatorBoostByUserId,
  computeSoundTrendBucketsFromPosts,
  defaultClientPostTrendScoreForSoundTrend,
  topSoundTrendBuckets,
} from '@/lib/ruehl/queries/trendFromPosts';

const LOG_PREFIX = '[feed]';

function logFeedError(context: string, err: unknown) {
  if (process.env.NODE_ENV === 'development') {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(LOG_PREFIX, context, msg);
  }
}

const PROFILE_RAIL_SELECT =
  'id, username, avatar_url, bio, identity_text, account_type, account_category, badge_verification_status, is_verified, created_at';

const ALL_CAT: AccountCategory[] = [
  'personal',
  'creator',
  'artist',
  'public_figure',
  'brand',
  'company',
  'shop',
  'restaurant',
  'radio_station',
  'magazine',
  'podcast',
  'publication',
];

function parseAccountType(raw: string | null): AccountType | null {
  if (raw === 'personal' || raw === 'business' || raw === 'media') return raw;
  return null;
}

function parseAccountCategory(raw: string | null): AccountCategory | null {
  if (!raw) return null;
  return ALL_CAT.includes(raw as AccountCategory) ? (raw as AccountCategory) : null;
}

function parseBadgeVerification(raw: string | null): BadgeVerificationStatus {
  if (raw == null || raw === '') return null;
  const n = String(raw).trim().toLowerCase();
  if (n === 'pending' || n === 'approved' || n === 'rejected') return n;
  return null;
}

function mapProfileRow(p: Record<string, unknown>): RuehlProfile {
  return {
    id: String(p.id ?? ''),
    username: typeof p.username === 'string' ? p.username : p.username == null ? null : String(p.username),
    avatar_url: typeof p.avatar_url === 'string' ? p.avatar_url : p.avatar_url == null ? null : String(p.avatar_url),
    bio: typeof p.bio === 'string' ? p.bio : p.bio == null ? null : String(p.bio),
    identity_text:
      typeof p.identity_text === 'string' ? p.identity_text : p.identity_text == null ? null : String(p.identity_text),
    account_type: parseAccountType(p.account_type == null ? null : String(p.account_type)),
    account_category: parseAccountCategory(p.account_category == null ? null : String(p.account_category)),
    badge_verification_status: parseBadgeVerification(
      p.badge_verification_status == null ? null : String(p.badge_verification_status),
    ),
    contact_email: null,
    contact_phone: null,
    website: null,
    display_category_label: null,
    display_contact_info: null,
    category_picked_at: null,
    is_verified: typeof p.is_verified === 'boolean' ? p.is_verified : null,
    created_at: p.created_at == null ? null : String(p.created_at),
  };
}

function rowToRuehlPost(row: Record<string, unknown>): RuehlPost {
  return normalizePost(row) as RuehlPost;
}

function isPostRowVisible(row: Record<string, unknown>): boolean {
  if (row.hidden_by_admin === true) return false;
  const vs = row.visibility_state;
  if (vs === 'hidden' || vs === 'removed') return false;
  return true;
}

async function loadMutualBlockUserIds(viewerId: string): Promise<Set<string>> {
  const hide = new Set<string>();
  const [a, b] = await Promise.all([
    supabase.from('blocked_users').select('blocked_id').eq('blocker_id', viewerId),
    supabase.from('blocked_users').select('blocker_id').eq('blocked_id', viewerId),
  ]);
  if (a.error) logFeedError('blocked_users out', a.error);
  if (b.error) logFeedError('blocked_users in', b.error);
  for (const r of a.data || []) {
    if (r.blocked_id) hide.add(r.blocked_id);
  }
  for (const r of b.data || []) {
    if (r.blocker_id) hide.add(r.blocker_id);
  }
  return hide;
}

function postEngagementScore(p: RuehlPost): number {
  return defaultClientPostTrendScoreForSoundTrend(p);
}

function rankFeedPosts(posts: RuehlPost[], boostByUser: Record<string, number>): RuehlPost[] {
  const score = (p: RuehlPost) => {
    const base = postEngagementScore(p);
    const echoes = Math.max(0, Number(p.echo_count ?? 0));
    const scroll = Math.max(0, Number(p.scroll_back_count ?? 0));
    const lifts = Math.max(0, Number(p.liftCount ?? p.lifts_count ?? 0));
    const listens = Math.max(0, Number(p.listen_count ?? 0));
    const t = p.created_at ? new Date(p.created_at).getTime() : 0;
    const recency = Number.isFinite(t) ? Math.exp(-(Date.now() - t) / (48 * 3600000)) : 0;
    const boost = boostByUser[p.user_id] ?? 0;
    return base + lifts * 6 + echoes * 4 + scroll * 3 + listens * 2 + recency * 12 + boost * 1.5;
  };
  return [...posts].sort((a, b) => score(b) - score(a));
}

/**
 * Attempt `fetch_explore_feed_bundle` if present (native migrations 20260405 / 20260406).
 * Payload shape varies — only accept array-of-post-rows or `{ posts: [...] }`.
 */
async function tryRpcExploreFeed(viewerId: string | null, limit: number, offset: number): Promise<RuehlPost[] | null> {
  const variants = [
    { p_limit: limit, p_offset: offset, p_viewer_id: viewerId },
    { limit_count: limit, offset_count: offset, viewer_uuid: viewerId },
    { p_limit: limit, p_offset: offset },
  ];

  for (const args of variants) {
    const { data, error } = await supabase.rpc('fetch_explore_feed_bundle', args as Record<string, unknown>);
    if (error) {
      if (/function .* does not exist|PGRST202/i.test(error.message || '')) return null;
      continue;
    }
    if (!data) continue;
    let rows: unknown[] = [];
    if (Array.isArray(data)) rows = data;
    else if (typeof data === 'object' && data !== null && Array.isArray((data as { posts?: unknown[] }).posts)) {
      rows = (data as { posts: unknown[] }).posts;
    }
    if (rows.length === 0) continue;
    const mapped = rows
      .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
      .map((r) => rowToRuehlPost(r));
    return mapped.slice(offset, offset + limit);
  }
  return null;
}

async function fallbackFetchPostsPool(limit: number): Promise<RuehlPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Math.min(600, Math.max(limit * 4, 120)));

  if (error) {
    logFeedError('fallbackFetchPostsPool', error);
    return [];
  }

  return (data || [])
    .filter((r) => isPostRowVisible(r as Record<string, unknown>))
    .map((r) => rowToRuehlPost(r as Record<string, unknown>));
}

export async function getHomeFeed(currentUserId: string | null, limit: number, offset: number): Promise<RuehlPost[]> {
  try {
    const rpc = await tryRpcExploreFeed(currentUserId, limit, offset);
    if (rpc && rpc.length > 0) return rpc;

    let pool = await fallbackFetchPostsPool(Math.max(limit + offset + 80, 160));

    if (currentUserId) {
      const blocked = await loadMutualBlockUserIds(currentUserId);
      pool = pool.filter((p) => !blocked.has(p.user_id));
    }

    const boost = buildCreatorBoostByUserId(pool as unknown as { user_id?: string }[], (row) =>
      defaultClientPostTrendScoreForSoundTrend(row as RuehlPost),
    );
    const ranked = rankFeedPosts(pool, boost);
    return ranked.slice(offset, offset + limit);
  } catch (e) {
    logFeedError('getHomeFeed', e);
    return [];
  }
}

/**
 * “Now” — last 24h posts, ordered by engagement + lifts (heuristic; no native recovery flags).
 */
export async function getNowFeed(currentUserId: string | null, limit: number): Promise<RuehlPost[]> {
  try {
    const cutoffIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .gte('created_at', cutoffIso)
      .order('created_at', { ascending: false })
      .limit(220);
    if (error) {
      logFeedError('getNowFeed posts', error);
      return [];
    }
    let rows = (data || [])
      .filter((r) => isPostRowVisible(r as Record<string, unknown>))
      .map((r) => rowToRuehlPost(r as Record<string, unknown>));
    if (currentUserId) {
      const blocked = await loadMutualBlockUserIds(currentUserId);
      rows = rows.filter((p) => !blocked.has(p.user_id));
    }
    const boost = buildCreatorBoostByUserId(rows as unknown as { user_id?: string }[], (row) =>
      postEngagementScore(row as RuehlPost),
    );
    return rankFeedPosts(rows, boost).slice(0, limit);
  } catch (e) {
    logFeedError('getNowFeed', e);
    return [];
  }
}

export type TrendingSound = {
  /** Route target — prefer `licensed_track_id` / Spotify-backed row id when present */
  id: string;
  trackName: string;
  artistName: string;
  coverUrl: string | null;
  previewUrl: string | null;
  usageCount: number;
  trendScore: number;
};

function licensedTitleArtist(row: Record<string, unknown>): { title: string; artist: string } {
  const title =
    String(row.title ?? row.name ?? row.track_title ?? row.track_name ?? '').trim() || 'Track';
  const artist = String(row.artist ?? row.artist_name ?? '').trim() || '';
  return { title, artist };
}

export async function getTrendingSounds(limit: number): Promise<TrendingSound[]> {
  try {
    const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(300);
    if (error) {
      logFeedError('getTrendingSounds posts', error);
      return [];
    }
    const rows = (data || []).map((r) => normalizePost(r as Record<string, unknown>) as RuehlPost);
    const buckets = computeSoundTrendBucketsFromPosts(rows, defaultClientPostTrendScoreForSoundTrend);
    const top = topSoundTrendBuckets(buckets, Math.max(limit, 8));

    const licensedIds = new Set<string>();
    for (const b of top) {
      const rep = b.representative as Record<string, unknown>;
      const resolved = resolvePostSound(rep as PostSoundInput);
      if (resolved?.kind === 'licensed') licensedIds.add(resolved.id);
      const ltid = rep.licensed_track_id;
      if (typeof ltid === 'string' && ltid) licensedIds.add(ltid);
    }

    let ltById = new Map<string, Record<string, unknown>>();
    if (licensedIds.size > 0) {
      const { data: ltRows, error: ltErr } = await supabase
        .from('licensed_tracks')
        .select('*')
        .in('id', [...licensedIds]);
      if (ltErr) logFeedError('getTrendingSounds licensed_tracks', ltErr);
      ltById = new Map((ltRows || []).map((r) => [String((r as { id?: string }).id), r as Record<string, unknown>]));
    }

    const out: TrendingSound[] = [];
    for (const b of top.slice(0, limit)) {
      const rep = b.representative as Record<string, unknown>;
      const resolved = resolvePostSound(rep as PostSoundInput);
      let id = resolved?.id || String(rep.licensed_track_id || rep.sound_id || b.key).slice(0, 36);
      const lt =
        resolved?.kind === 'licensed' && resolved.id
          ? ltById.get(resolved.id)
          : typeof rep.licensed_track_id === 'string'
            ? ltById.get(rep.licensed_track_id)
            : undefined;
      let trackName = b.track;
      let artistName = b.artist;
      let coverUrl: string | null = null;
      let previewUrl: string | null =
        typeof rep.music_preview_url === 'string' ? rep.music_preview_url : null;

      if (lt) {
        const ta = licensedTitleArtist(lt);
        if (ta.title && ta.title !== 'Track') trackName = ta.title;
        if (ta.artist) artistName = ta.artist;
        coverUrl = (lt.cover_url as string | null | undefined) || null;
        previewUrl = (lt.preview_url as string | null | undefined) || previewUrl;
        id = String(lt.id ?? id);
      }

      out.push({
        id,
        trackName,
        artistName,
        coverUrl,
        previewUrl,
        usageCount: b.usage,
        trendScore: b.trendScore,
      });
    }

    return out;
  } catch (e) {
    logFeedError('getTrendingSounds', e);
    return [];
  }
}

export async function getSuggestedProfiles(currentUserId: string | null, lim: number): Promise<RuehlProfile[]> {
  try {
    if (!currentUserId) return [];

    const [{ data: posts }, { data: follows }] = await Promise.all([
      supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(450),
      supabase.from('follows').select('following_id').eq('follower_id', currentUserId),
    ]);

    const following = new Set<string>((follows || []).map((f) => f.following_id).filter(Boolean));
    following.add(currentUserId);

    const normalized = ((posts || []) as Record<string, unknown>[]).map((r) => normalizePost(r) as RuehlPost);
    const boost = buildCreatorBoostByUserId(normalized, postEngagementScore);

    const sortedIds = Object.entries(boost)
      .sort((a, b) => b[1] - a[1])
      .map(([uid]) => uid)
      .filter((uid) => !following.has(uid))
      .slice(0, lim);

    if (sortedIds.length === 0) return [];

    const { data: profRows, error } = await supabase.from('profiles').select(PROFILE_RAIL_SELECT).in('id', sortedIds);
    if (error) {
      logFeedError('getSuggestedProfiles profiles', error);
      return [];
    }

    const byId = new Map((profRows || []).map((r) => [String((r as { id: string }).id), mapProfileRow(r as Record<string, unknown>)]));
    return sortedIds.map((id) => byId.get(id)).filter((p): p is RuehlProfile => Boolean(p));
  } catch (e) {
    logFeedError('getSuggestedProfiles', e);
    return [];
  }
}
