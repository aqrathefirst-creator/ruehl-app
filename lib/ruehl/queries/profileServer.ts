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
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      if (typeof console !== 'undefined') {
        console.warn('[getViewerUserId] auth.getUser', { message: error.message });
      }
      return null;
    }
    return user?.id ?? null;
  } catch (e) {
    if (typeof console !== 'undefined') {
      console.warn('[getViewerUserId] unexpected', e);
    }
    return null;
  }
}

export async function getProfileByUsername(username: string): Promise<RuehlProfilePage | null> {
  const raw = String(username || '').trim().replace(/^@+/, '');
  if (!raw) return null;

  const supabase = await createServerSupabase();
  const base = await getProfile(raw, supabase);
  if (!base?.id) return null;

  const { data: privRow, error: privErr } = await supabase
    .from('users')
    .select('is_private')
    .eq('id', base.id)
    .maybeSingle();

  if (privErr) {
    if (typeof console !== 'undefined') {
      console.warn('[getProfileByUsername] supabase error', {
        profileId: base.id,
        code: privErr.code,
        message: privErr.message,
      });
    }
  }

  const isPrivateAccount = privErr ? false : Boolean((privRow as { is_private?: boolean } | null)?.is_private);

  return { ...base, isPrivateAccount };
}

export type ProfileStatsRow = {
  /** Public post count (matches native Profile stats strip). */
  posts: number;
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

  const [followersRes, followingRes, postsCountRes, postsSampleRes, dropsRes, tuneIns] = await Promise.all([
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', profileId),
    supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', profileId),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', profileId),
    supabase.from('posts').select('id').eq('user_id', profileId).limit(800),
    supabase.from('drops').select('id', { count: 'exact', head: true }).eq('creator_id', profileId),
    countTuneInsForCreator(supabase, profileId),
  ]);

  if (followersRes.error && typeof console !== 'undefined') {
    console.warn('[getProfileStatsRow] follows (followers)', {
      profileId,
      code: followersRes.error.code,
      message: followersRes.error.message,
    });
  }
  if (followingRes.error && typeof console !== 'undefined') {
    console.warn('[getProfileStatsRow] follows (following)', {
      profileId,
      code: followingRes.error.code,
      message: followingRes.error.message,
    });
  }
  if (postsCountRes.error && typeof console !== 'undefined') {
    console.warn('[getProfileStatsRow] posts count', {
      profileId,
      code: postsCountRes.error.code,
      message: postsCountRes.error.message,
    });
  }
  if (postsSampleRes.error && typeof console !== 'undefined') {
    console.warn('[getProfileStatsRow] posts sample', {
      profileId,
      code: postsSampleRes.error.code,
      message: postsSampleRes.error.message,
    });
  }
  if (dropsRes.error && typeof console !== 'undefined') {
    console.warn('[getProfileStatsRow] drops', {
      profileId,
      code: dropsRes.error.code,
      message: dropsRes.error.message,
    });
  }

  const postIds = postsSampleRes.error
    ? []
    : ((postsSampleRes.data || []) as { id: string }[]).map((r) => r.id).filter(Boolean);
  let liftsReceived = 0;
  if (postIds.length > 0) {
    const { count, error } = await supabase
      .from('post_lifts')
      .select('id', { count: 'exact', head: true })
      .in('post_id', postIds);
    if (error) {
      if (typeof console !== 'undefined') {
        console.warn('[getProfileStatsRow] post_lifts', {
          profileId,
          code: error.code,
          message: error.message,
        });
      }
    } else {
      liftsReceived = count ?? 0;
    }
  }

  return {
    posts: postsCountRes.error ? 0 : postsCountRes.count ?? 0,
    liftsReceived,
    followers: followersRes.error ? 0 : followersRes.count ?? 0,
    following: followingRes.error ? 0 : followingRes.count ?? 0,
    drops: dropsRes.error ? 0 : dropsRes.count ?? 0,
    tuneIns,
  };
}

/** Minimal lifted-post tiles for Identity page grid (server-only). */
export type IdentityLiftedThumb = { id: string; thumbnailUrl: string | null };

export type IdentityPagePayload = {
  liftsGiven: number;
  echoCount: number;
  liftedThumbs: IdentityLiftedThumb[];
};

function pickPostThumbnail(row: Record<string, unknown>): string | null {
  const thumb = row.thumbnail_url;
  if (typeof thumb === 'string' && thumb.trim()) return thumb.trim();
  const urls = row.media_urls;
  if (Array.isArray(urls) && urls[0] != null) return String(urls[0]);
  const mu = row.media_url;
  return typeof mu === 'string' && mu.trim() ? mu.trim() : null;
}

export async function getIdentityPagePayload(profileId: string): Promise<IdentityPagePayload> {
  const supabase = await createServerSupabase();

  const [liftsGivenRes, echoesRes, liftsRows] = await Promise.all([
    supabase.from('post_lifts').select('id', { count: 'exact', head: true }).eq('user_id', profileId),
    supabase.from('drop_echoes').select('id', { count: 'exact', head: true }).eq('user_id', profileId),
    supabase
      .from('post_lifts')
      .select('post_id')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(120),
  ]);

  const liftIds = [...new Set((liftsRows.data || []).map((l: { post_id?: string }) => l.post_id).filter(Boolean))] as string[];
  const slice = liftIds.slice(0, 12);

  let liftedThumbs: IdentityLiftedThumb[] = [];
  if (slice.length > 0) {
    const { data: posts } = await supabase
      .from('posts')
      .select('id, thumbnail_url, media_url, media_urls')
      .in('id', slice);
    const byId = new Map((posts || []).map((p: Record<string, unknown>) => [String(p.id), p as Record<string, unknown>]));
    liftedThumbs = slice.map((id) => ({
      id,
      thumbnailUrl: pickPostThumbnail(byId.get(id) || {}),
    }));
  }

  return {
    liftsGiven: liftsGivenRes.error ? 0 : liftsGivenRes.count ?? 0,
    echoCount: echoesRes.error ? 0 : echoesRes.count ?? 0,
    liftedThumbs,
  };
}

export async function getCanViewPrivateTabs(profileId: string, viewerId: string | null): Promise<boolean> {
  const supabase = await createServerSupabase();
  const { data: row, error: rowErr } = await supabase
    .from('users')
    .select('is_private')
    .eq('id', profileId)
    .maybeSingle();
  if (rowErr) {
    if (typeof console !== 'undefined') {
      console.warn('[getCanViewPrivateTabs] users', {
        profileId,
        code: rowErr.code,
        message: rowErr.message,
      });
    }
    return false;
  }
  const isPrivate = Boolean((row as { is_private?: boolean } | null)?.is_private);
  if (!isPrivate) return true;
  if (!viewerId) return false;
  if (viewerId === profileId) return true;
  const { data: fol, error: folErr } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', viewerId)
    .eq('following_id', profileId)
    .maybeSingle();
  if (folErr) {
    if (typeof console !== 'undefined') {
      console.warn('[getCanViewPrivateTabs] follows', {
        profileId,
        viewerId,
        code: folErr.code,
        message: folErr.message,
      });
    }
    return false;
  }
  return Boolean(fol);
}
