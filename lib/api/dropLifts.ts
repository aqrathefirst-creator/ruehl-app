import { supabase } from '@/lib/supabase';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function isDropLiftedByCurrentUser(dropId: string): Promise<boolean> {
  const did = String(dropId || '').trim();
  if (!UUID_RE.test(did)) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user?.id;
  if (!uid) return false;
  const { data, error } = await supabase
    .from('drop_lifts')
    .select('id')
    .eq('user_id', uid)
    .eq('drop_id', did)
    .limit(1);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}

export async function toggleDropLift(dropId: string): Promise<{ lifted: boolean }> {
  const did = String(dropId || '').trim();
  if (!UUID_RE.test(did)) throw new Error('Invalid drop');

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user?.id;
  if (!uid) throw new Error('Sign in to lift drops');

  const existing = await supabase
    .from('drop_lifts')
    .select('id')
    .eq('user_id', uid)
    .eq('drop_id', did)
    .limit(1);

  if (existing.error) throw existing.error;

  if ((existing.data?.length ?? 0) > 0) {
    const { error } = await supabase.from('drop_lifts').delete().eq('user_id', uid).eq('drop_id', did);
    if (error) throw error;
    return { lifted: false };
  }

  const { error } = await supabase.from('drop_lifts').insert({ user_id: uid, drop_id: did });
  if (error) throw error;

  const check = await supabase.from('drop_lifts').select('id').eq('user_id', uid).eq('drop_id', did).limit(1);
  if (check.error) throw check.error;
  return { lifted: (check.data?.length ?? 0) > 0 };
}
