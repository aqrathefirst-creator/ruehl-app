/**
 * Server-only profile reads (App Router RSC). Uses session cookies for RLS.
 */

import type { RuehlProfile } from '@/lib/ruehl/types';
import { createServerSupabase } from '@/lib/server/supabaseServer';
import { getProfile } from '@/lib/ruehl/queries/profile';

export type RuehlProfilePage = RuehlProfile & {
  /** When true, tab content is hidden for non-followers (native private gate). */
  isPrivateAccount: boolean;
};

export async function getViewerUserId(): Promise<string | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getProfileByUsername(username: string): Promise<RuehlProfilePage | null> {
  const raw = String(username || '').trim().replace(/^@+/, '');
  if (!raw) return null;

  const supabase = await createServerSupabase();
  const base = await getProfile(raw, supabase);
  if (!base?.id) return null;

  const { data: privRow } = await supabase.from('users').select('is_private').eq('id', base.id).maybeSingle();

  const isPrivateAccount = Boolean((privRow as { is_private?: boolean } | null)?.is_private);

  return { ...base, isPrivateAccount };
}

export type ProfileStatsRow = {
  liftsReceived: number;
  followers: number;
  following: number;
  drops: number;
  tuneIns: number;
};

async function countTuneInsForCreator(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  profileId: string,
): Promise<number> {
  const primary = await supabase
    .from('tune_ins')
    .select('tuner_id', { count: 'exact', head: true })
    .eq('creator_id', profileId);
  if (!primary.error) return primary.count ?? 0;
  const legacy = await supabase
    .from('drop_tune_ins')
    .select('user_id', { count: 'exact', head: true })
    .eq('creator_id', profileId);
  if (!legacy.error) return legacy.count ?? 0;
  return 0;
}

export async function getProfileStatsRow(profileId: string): Promise<ProfileStatsRow> {
  const supabase = await createServerSupabase();

  const [followersRes, followingRes, postsRes, dropsRes, tuneIns] = await Promise.all([
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', profileId),
    supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', profileId),
    supabase.from('posts').select('id').eq('user_id', profileId).limit(800),
    supabase.from('drops').select('id', { count: 'exact', head: true }).eq('creator_id', profileId),
    countTuneInsForCreator(supabase, profileId),
  ]);

  const postIds = ((postsRes.data || []) as { id: string }[]).map((r) => r.id).filter(Boolean);
  let liftsReceived = 0;
  if (postIds.length > 0) {
    const { count, error } = await supabase
      .from('post_lifts')
      .select('id', { count: 'exact', head: true })
      .in('post_id', postIds);
    if (!error) liftsReceived = count ?? 0;
  }

  return {
    liftsReceived,
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
    drops: dropsRes.error ? 0 : dropsRes.count ?? 0,
    tuneIns,
  };
}

export async function getCanViewPrivateTabs(profileId: string, viewerId: string | null): Promise<boolean> {
  const supabase = await createServerSupabase();
  const { data: row } = await supabase.from('users').select('is_private').eq('id', profileId).maybeSingle();
  const isPrivate = Boolean((row as { is_private?: boolean } | null)?.is_private);
  if (!isPrivate) return true;
  if (!viewerId) return false;
  if (viewerId === profileId) return true;
  const { data: fol } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', viewerId)
    .eq('following_id', profileId)
    .maybeSingle();
  return Boolean(fol);
}
