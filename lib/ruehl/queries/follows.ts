/**
 * Paginated follow lists for `/[username]/followers` and `/[username]/following`.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountType, BadgeVerificationStatus } from '@/lib/ruehl/accountTypes';
import { parseVerificationStatus } from '@/lib/ruehl/verification';

function parseAccountType(raw: string | null | undefined): AccountType | null {
  const s = String(raw || '').trim().toLowerCase();
  if (s === 'personal' || s === 'business' || s === 'media') return s;
  return null;
}

export type FollowListItem = {
  id: string;
  username: string;
  avatar_url: string | null;
  badge_verification_status: BadgeVerificationStatus;
  is_verified: boolean | null;
  account_type: AccountType | null;
};

const PROFILE_SELECT = 'id, username, avatar_url, badge_verification_status, is_verified';

function mapProfilesAndUsers(
  orderedIds: string[],
  profiles: Array<Record<string, unknown>>,
  users: Array<Record<string, unknown>>,
): FollowListItem[] {
  const profileMap = new Map<string, Record<string, unknown>>();
  for (const p of profiles) {
    const id = String(p.id || '');
    if (id) profileMap.set(id, p);
  }
  const userMap = new Map<string, Record<string, unknown>>();
  for (const u of users) {
    const id = String(u.id || '');
    if (id) userMap.set(id, u);
  }

  const out: FollowListItem[] = [];
  for (const id of orderedIds) {
    const p = profileMap.get(id);
    if (!p) continue;
    const rawBadge = p.badge_verification_status == null ? null : String(p.badge_verification_status);
    const badge = parseVerificationStatus(String(rawBadge || '').trim().toLowerCase()) as BadgeVerificationStatus;
    const legacy =
      typeof p.is_verified === 'boolean'
        ? p.is_verified
        : typeof (p as { verified?: boolean }).verified === 'boolean'
          ? Boolean((p as { verified?: boolean }).verified)
          : null;
    const u = userMap.get(id);
    const at =
      u && u.account_type != null ? parseAccountType(String(u.account_type)) : null;

    out.push({
      id,
      username: typeof p.username === 'string' ? p.username : String(p.username ?? 'user'),
      avatar_url: p.avatar_url == null ? null : String(p.avatar_url),
      badge_verification_status: badge ?? (legacy === true ? 'approved' : null),
      is_verified: legacy,
      account_type: at,
    });
  }
  return out;
}

async function hydrateUsers(
  client: SupabaseClient,
  orderedIds: string[],
): Promise<FollowListItem[]> {
  if (orderedIds.length === 0) return [];

  const [{ data: profiles, error: pe }, { data: users, error: ue }] = await Promise.all([
    client.from('profiles').select(PROFILE_SELECT).in('id', orderedIds),
    client.from('users').select('id, account_type').in('id', orderedIds),
  ]);

  if (pe) throw pe;
  if (ue) throw ue;

  return mapProfilesAndUsers(orderedIds, (profiles || []) as Record<string, unknown>[], (users || []) as Record<
    string,
    unknown
  >[]);
}

export async function getFollowersOf(
  userId: string,
  offset: number,
  limit: number,
  client: SupabaseClient,
): Promise<FollowListItem[]> {
  const uid = String(userId || '').trim();
  if (!uid) return [];

  const { data: follows, error } = await client
    .from('follows')
    .select('follower_id, created_at')
    .eq('following_id', uid)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const followerIds = (follows || []).map((f) => String((f as { follower_id?: string }).follower_id || '')).filter(Boolean);

  return hydrateUsers(client, followerIds);
}

export async function getFollowingOf(
  userId: string,
  offset: number,
  limit: number,
  client: SupabaseClient,
): Promise<FollowListItem[]> {
  const uid = String(userId || '').trim();
  if (!uid) return [];

  const { data: follows, error } = await client
    .from('follows')
    .select('following_id, created_at')
    .eq('follower_id', uid)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const followingIds = (follows || [])
    .map((f) => String((f as { following_id?: string }).following_id || ''))
    .filter(Boolean);

  return hydrateUsers(client, followingIds);
}
