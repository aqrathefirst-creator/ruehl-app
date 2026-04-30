/**
 * Profile tab grids for `/[username]` — mirrors native `ProfileScreen` tab data paths (read-only).
 */

import { supabase } from '@/lib/supabase';
import type { RuehlPost } from '@/lib/ruehl/types';
import { isPowrPost, normalizePost } from '@/lib/ruehl/posts';

function rowToRuehlPost(row: Record<string, unknown>): RuehlPost {
  return normalizePost(row) as RuehlPost;
}

export async function getPowrPostsByUser(userId: string, limit = 20): Promise<RuehlPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(250);
  if (error) throw error;
  const powr = (data || []).filter((r) => isPowrPost(r as Record<string, unknown>));
  return powr.slice(0, limit).map((r) => rowToRuehlPost(r as Record<string, unknown>));
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

export type ProfileDropEchoRow = {
  id: string;
  drop_id: string;
  user_id: string;
  duration_seconds: number | null;
  created_at: string | null;
};

export async function getEchoesByUser(userId: string, limit = 20): Promise<ProfileDropEchoRow[]> {
  const { data, error } = await supabase
    .from('drop_echoes')
    .select('id, drop_id, user_id, duration_seconds, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as ProfileDropEchoRow[];
}

export async function getLiftedPostsByUser(userId: string, limit = 20): Promise<RuehlPost[]> {
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
  const { data, error } = await supabase.from('posts').select('*').in('id', slice);
  if (error) throw error;
  const byId = new Map((data || []).map((r) => [(r as { id: string }).id, r as Record<string, unknown>]));
  return slice.map((id) => byId.get(id)).filter(Boolean).map((r) => rowToRuehlPost(r!));
}
