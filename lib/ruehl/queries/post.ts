/**
 * Single-post reads for `/post/[id]` — prefers `visible_posts` when deployed; falls back to `posts`.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getProfile } from '@/lib/ruehl/queries/profile';
import { normalizePost } from '@/lib/ruehl/posts';
import { normalizePostRowMediaType } from '@/lib/ruehl/postMedia';
import type { RuehlPost, RuehlProfile } from '@/lib/ruehl/types';

function isMissingRelation(err: { message?: string; code?: string } | null): boolean {
  const m = String(err?.message || '').toLowerCase();
  return err?.code === '42P01' || (m.includes('relation') && m.includes('does not exist'));
}

function rowToRuehlPost(row: Record<string, unknown>): RuehlPost {
  return normalizePost(row) as RuehlPost;
}

export type PostDetailPost = RuehlPost & {
  has_voice?: boolean | null;
  voice_url?: string | null;
  audio_url?: string | null;
  voice_caption?: string | null;
  hide_shares?: boolean | null;
  media_visibility?: string | null;
};

export type PostDetailPageData = {
  post: PostDetailPost;
  author: RuehlProfile | null;
  commentCount: number;
};

export async function getPostById(postId: string, client: SupabaseClient): Promise<PostDetailPageData | null> {
  const id = String(postId || '').trim();
  if (!id) return null;

  let row: Record<string, unknown> | null = null;

  const vp = await client.from('visible_posts').select('*').eq('id', id).maybeSingle();
  if (vp.error) {
    if (isMissingRelation(vp.error)) {
      const p = await client.from('posts').select('*').eq('id', id).maybeSingle();
      if (p.error) throw p.error;
      row = (p.data as Record<string, unknown>) ?? null;
    } else {
      throw vp.error;
    }
  } else {
    row = (vp.data as Record<string, unknown>) ?? null;
  }

  if (!row?.id || !row.user_id) return null;

  const merged = normalizePostRowMediaType(row) as Record<string, unknown>;
  const base = rowToRuehlPost(merged);
  const post: PostDetailPost = {
    ...base,
    has_voice: typeof merged.has_voice === 'boolean' ? merged.has_voice : null,
    voice_url: merged.voice_url == null ? null : String(merged.voice_url),
    audio_url: merged.audio_url == null ? null : String(merged.audio_url),
    voice_caption: merged.voice_caption == null ? null : String(merged.voice_caption),
    hide_shares: typeof merged.hide_shares === 'boolean' ? merged.hide_shares : null,
    media_visibility: merged.media_visibility == null ? null : String(merged.media_visibility),
  };

  const uid = String(row.user_id);
  const [author, cc] = await Promise.all([
    getProfile(uid, client),
    client.from('comments').select('id', { count: 'exact', head: true }).eq('post_id', id),
  ]);

  return {
    post,
    author,
    commentCount: cc.error ? 0 : cc.count ?? 0,
  };
}
