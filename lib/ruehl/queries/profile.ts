/**
 * Profile data access — uses `@/lib/supabase` client only.
 * Maps DB rows into `lib/ruehl` shapes (Phase 2.2 types).
 */

import { supabase } from '@/lib/supabase';
import type { AccountCategory, AccountType } from '@/lib/ruehl/accountTypes';
import type { RuehlPost, RuehlProfile } from '@/lib/ruehl/types';
import { isPowrPost, normalizePost, resolvePostSound, type ResolvedSound } from '@/lib/ruehl/posts';
import { parseVerificationStatus } from '@/lib/ruehl/verification';
import type { PostgrestError } from '@supabase/supabase-js';

function isMissingColumnError(err: PostgrestError): boolean {
  return /column|does not exist|schema cache/i.test(err.message || '');
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

const PROFILE_SELECT =
  'id, username, avatar_url, bio, identity_text, account_type, account_category, badge_verification_status, contact_email, contact_phone, website, display_category_label, display_contact_info, category_picked_at, is_verified, created_at';

const USERS_SELECT =
  'id, username, avatar_url, bio, identity_text, account_type, account_category, contact_email, contact_phone, website, display_category_label, display_contact_info, category_picked_at, created_at';

function parseAccountType(raw: string | null): AccountType | null {
  if (raw === 'personal' || raw === 'business' || raw === 'media') return raw;
  return null;
}

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

function parseAccountCategory(raw: string | null): AccountCategory | null {
  if (!raw) return null;
  return ALL_CAT.includes(raw as AccountCategory) ? (raw as AccountCategory) : null;
}

function parseBadgeVerification(raw: string | null): RuehlProfile['badge_verification_status'] {
  if (raw == null || raw === '') return null;
  const normalized = String(raw).trim().toLowerCase();
  return parseVerificationStatus(normalized);
}

function mapProfileRow(p: Record<string, unknown>, u: Record<string, unknown> | null): RuehlProfile {
  const users = u || {};
  const pickStr = (key: string) => {
    const pv = p[key];
    const uv = users[key];
    const v = pv !== undefined && pv !== null && String(pv).length > 0 ? pv : uv;
    return typeof v === 'string' ? v : v == null ? null : String(v);
  };
  const pickBool = (key: string) => {
    const pv = p[key];
    const uv = users[key];
    const v = pv !== undefined ? pv : uv;
    return typeof v === 'boolean' ? v : null;
  };

  const at = parseAccountType(pickStr('account_type'));
  const ac = parseAccountCategory(pickStr('account_category'));

  return {
    id: String(p.id ?? ''),
    username: pickStr('username'),
    avatar_url: pickStr('avatar_url'),
    bio: pickStr('bio'),
    identity_text: pickStr('identity_text'),
    account_type: at,
    account_category: ac,
    badge_verification_status: parseBadgeVerification(pickStr('badge_verification_status')),
    contact_email: pickStr('contact_email'),
    contact_phone: pickStr('contact_phone'),
    website: pickStr('website'),
    display_category_label: pickBool('display_category_label'),
    display_contact_info: pickBool('display_contact_info'),
    category_picked_at: pickStr('category_picked_at'),
    is_verified: typeof p.is_verified === 'boolean' ? p.is_verified : null,
    created_at: pickStr('created_at'),
  };
}

/**
 * Resolve profile by UUID or `@username` / `username` string.
 * Returns `null` when not found; throws on transport errors.
 */
export async function getProfile(userIdOrUsername: string): Promise<RuehlProfile | null> {
  const raw = String(userIdOrUsername || '').trim();
  if (!raw) return null;

  let profileRow: Record<string, unknown> | null = null;

  if (isUuid(raw)) {
    const { data, error } = await supabase.from('profiles').select(PROFILE_SELECT).eq('id', raw).maybeSingle();
    if (error) throw error;
    profileRow = (data as Record<string, unknown>) ?? null;
  } else {
    const normalized = raw.replace(/^@+/, '');
    const { data: fromUsers, error: e1 } = await supabase
      .from('users')
      .select('id')
      .ilike('username', normalized)
      .maybeSingle();
    if (e1) throw e1;
    const uid = (fromUsers as { id?: string } | null)?.id;
    if (uid) {
      const { data, error } = await supabase.from('profiles').select(PROFILE_SELECT).eq('id', uid).maybeSingle();
      if (error) throw error;
      profileRow = (data as Record<string, unknown>) ?? null;
    }
    if (!profileRow) {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .ilike('username', normalized)
        .maybeSingle();
      if (error) throw error;
      profileRow = (data as Record<string, unknown>) ?? null;
    }
  }

  if (!profileRow?.id) return null;

  let mergedUsers: Record<string, unknown> | null = null;
  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .select(USERS_SELECT)
    .eq('id', String(profileRow.id))
    .maybeSingle();
  if (userErr && !isMissingColumnError(userErr)) throw userErr;
  if (!userErr && userRow) mergedUsers = userRow as Record<string, unknown>;

  return mapProfileRow(profileRow, mergedUsers);
}

/** Fallback select when extended account columns are not yet migrated. */
export async function getProfileLenient(userIdOrUsername: string): Promise<RuehlProfile | null> {
  try {
    return await getProfile(userIdOrUsername);
  } catch (e) {
    const err = e as PostgrestError;
    if (!isMissingColumnError(err)) throw e;
  }

  const raw = String(userIdOrUsername || '').trim();
  if (!raw) return null;

  let row: Record<string, unknown> | null = null;
  if (isUuid(raw)) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', raw).maybeSingle();
    if (error) throw error;
    row = (data as Record<string, unknown>) ?? null;
  } else {
    const normalized = raw.replace(/^@+/, '');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', normalized)
      .maybeSingle();
    if (error) throw error;
    row = (data as Record<string, unknown>) ?? null;
  }

  if (!row?.id) return null;

  const base = mapProfileRow(
    {
      ...row,
      identity_text: row.identity_text ?? null,
      account_type: row.account_type ?? null,
      account_category: row.account_category ?? null,
      badge_verification_status: row.badge_verification_status ?? null,
      contact_email: row.contact_email ?? null,
      contact_phone: row.contact_phone ?? null,
      website: row.website ?? null,
      display_category_label: row.display_category_label ?? null,
      display_contact_info: row.display_contact_info ?? null,
      category_picked_at: row.category_picked_at ?? null,
    },
    null,
  );
  return base;
}

export type ProfileTab = 'posts' | 'powr' | 'likes' | 'lifted';

function rowToRuehlPost(row: Record<string, unknown>): RuehlPost {
  return normalizePost(row) as RuehlPost;
}

/**
 * Fetch posts for a profile tab with simple offset pagination.
 */
export async function getProfilePosts(
  profileId: string,
  tab: ProfileTab,
  limit: number,
  offset: number,
): Promise<RuehlPost[]> {
  if (tab === 'posts') {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return (data || []).map((r) => rowToRuehlPost(r as Record<string, unknown>));
  }

  if (tab === 'powr') {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(250);
    if (error) throw error;
    const powr = (data || []).filter((r) => isPowrPost(r as Record<string, unknown>));
    return powr.slice(offset, offset + limit).map((r) => rowToRuehlPost(r as Record<string, unknown>));
  }

  if (tab === 'likes') {
    const { data: likes, error: le } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', profileId);
    if (le) throw le;
    let ids = [...new Set((likes || []).map((l: { post_id?: string }) => l.post_id).filter(Boolean))] as string[];
    if (ids.length === 0) return [];
    ids = ids.slice(0, 120);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .in('id', ids)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return (data || []).map((r) => rowToRuehlPost(r as Record<string, unknown>));
  }

  const { data: lifts, error: liftErr } = await supabase
    .from('post_lifts')
    .select('post_id')
    .eq('user_id', profileId);
  if (liftErr) throw liftErr;
  let ids = [...new Set((lifts || []).map((l: { post_id?: string }) => l.post_id).filter(Boolean))] as string[];
  if (ids.length === 0) return [];
  ids = ids.slice(0, 120);
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data || []).map((r) => rowToRuehlPost(r as Record<string, unknown>));
}

export type CurrentSoundDisplay = ResolvedSound & {
  coverUrl: string | null;
  spotifyTrackId: string | null;
};

/**
 * Latest post with an attachable sound; enriches licensed rows with `licensed_tracks` for artwork + Spotify id.
 */
export async function getCurrentSound(profileId: string): Promise<CurrentSoundDisplay | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) throw error;

  const rows = (data || []) as Record<string, unknown>[];
  for (const row of rows) {
    const resolved = resolvePostSound(row);
    if (!resolved) continue;

    let coverUrl: string | null = null;
    let spotifyTrackId: string | null = null;

    if (resolved.kind === 'licensed') {
      const { data: lt } = await supabase
        .from('licensed_tracks')
        .select('cover_url, spotify_id')
        .eq('id', resolved.id)
        .maybeSingle();
      const ltRow = lt as { cover_url?: string | null; spotify_id?: string | null } | null;
      coverUrl = ltRow?.cover_url ?? null;
      spotifyTrackId = ltRow?.spotify_id ? String(ltRow.spotify_id) : null;
    }

    return {
      ...resolved,
      coverUrl,
      spotifyTrackId,
    };
  }

  return null;
}

export async function getProfilePostCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', profileId);
  if (error) throw error;
  return count ?? 0;
}

export async function getFollowersCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('follower_id', { count: 'exact', head: true })
    .eq('following_id', profileId);
  if (error) throw error;
  return count ?? 0;
}

export async function getFollowingCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('following_id', { count: 'exact', head: true })
    .eq('follower_id', profileId);
  if (error) throw error;
  return count ?? 0;
}
