import { supabase } from '@/lib/supabase';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Whether the current session has lifted `postId`. Returns false when signed out or on error.
 */
export async function isPostLiftedByCurrentUser(postId: string): Promise<boolean> {
  const pid = String(postId || '').trim();
  if (!UUID_RE.test(pid)) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user?.id;
  if (!uid) return false;
  const { data, error } = await supabase
    .from('post_lifts')
    .select('id')
    .eq('user_id', uid)
    .eq('post_id', pid)
    .limit(1);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}

/**
 * Toggle lift for the signed-in user — mirrors native `togglePostLift` (`post_lifts` upsert/delete).
 */
export async function togglePostLift(postId: string): Promise<{ lifted: boolean }> {
  const pid = String(postId || '').trim();
  if (!UUID_RE.test(pid)) throw new Error('Invalid post');

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user?.id;
  if (!uid) throw new Error('Sign in to lift posts');

  const existing = await supabase
    .from('post_lifts')
    .select('id')
    .eq('user_id', uid)
    .eq('post_id', pid)
    .limit(1);

  if (existing.error) throw existing.error;

  if ((existing.data?.length ?? 0) > 0) {
    const { error } = await supabase.from('post_lifts').delete().eq('user_id', uid).eq('post_id', pid);
    if (error) throw error;
    return { lifted: false };
  }

  const { error } = await supabase.from('post_lifts').upsert(
    { user_id: uid, post_id: pid },
    { onConflict: 'user_id,post_id' },
  );
  if (error) throw error;

  const check = await supabase.from('post_lifts').select('id').eq('user_id', uid).eq('post_id', pid).limit(1);
  if (check.error) throw check.error;
  return { lifted: (check.data?.length ?? 0) > 0 };
}
