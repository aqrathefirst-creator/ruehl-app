import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type ProfileDisplayUpdate = Partial<{
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  full_name: string | null;
  identity_text: string | null;
  identity_tone: string | null;
  artist_name: string | null;
  track_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  display_category_label: boolean;
  display_contact_info: boolean;
  category_picked_at: string | null;
  badge_verification_status: string | null;
}>;

export function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

/**
 * Canonical write path for profile display fields — `public.profiles` only.
 * Pass any Supabase client (browser `createBrowserClient` or server/session client).
 */
export async function updateProfileDisplay(
  client: SupabaseClient,
  userId: string,
  update: ProfileDisplayUpdate,
): Promise<{ error: PostgrestError | null }> {
  const payload = omitUndefined(update as Record<string, unknown>);
  if (Object.keys(payload).length === 0) {
    return { error: null };
  }
  const { error } = await client.from('profiles').update(payload).eq('id', userId);
  return { error };
}

export async function upsertProfileDisplay(
  client: SupabaseClient,
  userId: string,
  update: ProfileDisplayUpdate,
): Promise<{ error: PostgrestError | null }> {
  const payload = omitUndefined({ id: userId, ...(update as Record<string, unknown>) });
  const { error } = await client.from('profiles').upsert(payload, { onConflict: 'id' });
  return { error };
}

/** Browser-only convenience — uses the shared client singleton. */
export async function updateProfileDisplayBrowser(
  userId: string,
  update: ProfileDisplayUpdate,
): Promise<{ error: PostgrestError | null }> {
  return updateProfileDisplay(supabase, userId, update);
}

export async function upsertProfileDisplayBrowser(
  userId: string,
  update: ProfileDisplayUpdate,
): Promise<{ error: PostgrestError | null }> {
  return upsertProfileDisplay(supabase, userId, update);
}
