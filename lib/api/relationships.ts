import { supabase } from '@/lib/supabase';

export type FollowState = 'not_following' | 'requested' | 'following' | 'self';

export async function getFollowState(viewerId: string, targetId: string): Promise<FollowState> {
  const viewer = String(viewerId || '').trim();
  const target = String(targetId || '').trim();
  if (!viewer || !target) return 'not_following';
  if (viewer === target) return 'self';

  const [requestRes, followRes] = await Promise.all([
    supabase
      .from('follow_requests')
      .select('id')
      .eq('requester_id', viewer)
      .eq('requestee_id', target)
      .limit(1),
    supabase.from('follows').select('id').eq('follower_id', viewer).eq('following_id', target).maybeSingle(),
  ]);

  if (requestRes.error) throw requestRes.error;
  if (followRes.error) throw followRes.error;

  if (requestRes.data && requestRes.data.length > 0) return 'requested';
  if (followRes.data?.id) return 'following';
  return 'not_following';
}

export async function sendFollowRequest(targetId: string): Promise<string> {
  const { data, error } = await supabase.rpc('send_follow_request', { p_target_id: targetId });
  if (error) throw error;
  return String(data || '');
}

export async function cancelFollowRequest(targetId: string): Promise<string> {
  const { data, error } = await supabase.rpc('cancel_follow_request', { p_target_id: targetId });
  if (error) throw error;
  return String(data || '');
}

export async function unfollow(viewerId: string, targetId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', viewerId)
    .eq('following_id', targetId);
  if (error) throw error;
}

export async function checkIsTunedIn(tunerId: string, creatorId: string): Promise<boolean> {
  if (!tunerId || !creatorId || tunerId === creatorId) return false;
  const { data, error } = await supabase
    .from('tune_ins')
    .select('tuner_id')
    .eq('tuner_id', tunerId)
    .eq('creator_id', creatorId)
    .maybeSingle();
  if (!error && data) return true;
  const legacy = await supabase
    .from('drop_tune_ins')
    .select('user_id')
    .eq('user_id', tunerId)
    .eq('creator_id', creatorId)
    .maybeSingle();
  return !legacy.error && !!legacy.data;
}

/**
 * Tune In / Tune Out — `ruehl-native/lib/ruehl/queries/tuneIns.ts` plus `drop_tune_ins` fallback for older DBs.
 */
export async function toggleTuneIn(
  tunerId: string,
  creatorId: string,
  currentState: boolean,
): Promise<{ success: boolean; newState: boolean; error?: string }> {
  if (!tunerId || !creatorId || tunerId === creatorId) {
    return { success: false, newState: currentState, error: 'Invalid tune-in request.' };
  }

  try {
    if (!currentState) {
      const { error } = await supabase.from('tune_ins').insert([{ tuner_id: tunerId, creator_id: creatorId }]);
      if (!error) return { success: true, newState: true };

      const msg = error.message ?? '';
      const dup = error.code === '23505' || /duplicate|unique|already exists/i.test(msg);
      if (dup) {
        const tuned = await checkIsTunedIn(tunerId, creatorId);
        return { success: true, newState: tuned };
      }

      const leg = await supabase.from('drop_tune_ins').insert([{ user_id: tunerId, creator_id: creatorId }]);
      if (!leg.error) return { success: true, newState: true };
      const m2 = leg.error.message ?? '';
      const d2 = leg.error.code === '23505' || /duplicate|unique|already exists/i.test(m2);
      if (d2) {
        const tuned = await checkIsTunedIn(tunerId, creatorId);
        return { success: true, newState: tuned };
      }
      return { success: false, newState: false, error: m2 || msg || 'Could not tune in.' };
    }

    await supabase.from('tune_ins').delete().eq('tuner_id', tunerId).eq('creator_id', creatorId);
    await supabase.from('drop_tune_ins').delete().eq('user_id', tunerId).eq('creator_id', creatorId);
    return { success: true, newState: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Something went wrong.';
    return { success: false, newState: currentState, error: msg };
  }
}
