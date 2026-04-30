import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Platform admin flag via SECURITY DEFINER RPC — do not SELECT `public.users.is_admin`
 * with the anon/authenticated role (column grants exclude it).
 */
export async function isUserPlatformAdmin(client: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await client.rpc('is_user_admin', { p_user_id: userId });
  return !error && Boolean(data);
}
