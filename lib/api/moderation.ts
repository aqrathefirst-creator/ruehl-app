import { supabase } from '@/lib/supabase';

export async function checkCurrentUserBanned(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.rpc('is_user_banned', { uid: user.id });
  if (error) return false;
  return Boolean(data);
}

export async function checkCurrentUserDeleted(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.rpc('is_user_deleted', { uid: user.id });
  if (error) return false;
  return Boolean(data);
}

export async function getCurrentUserDeletedAt(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('users').select('deleted_at').eq('id', user.id).maybeSingle();
  if (error) return null;
  return (data as { deleted_at?: string | null } | null)?.deleted_at ?? null;
}

export async function requestAccountDeletion(): Promise<void> {
  const { error } = await supabase.rpc('request_account_deletion');
  if (error) throw error;
}

export async function restoreAccount(): Promise<void> {
  const { error } = await supabase.rpc('restore_account');
  if (error) throw error;
}
