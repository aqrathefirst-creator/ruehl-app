import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';

export async function GET(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const [{ data: likesData, error: likesError }, { data: savedData, error: savedError }, { data: commentsData, error: commentsError }, { data: liftsData, error: liftsError }, { data: matchData, error: matchError }] = await Promise.all([
    auth.supabase.from('likes').select('id, post_id, created_at').eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(50),
    auth.supabase.from('saved_posts').select('id, post_id, created_at').eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(50),
    auth.supabase.from('comments').select('id, post_id, content, created_at').eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(50),
    auth.supabase.from('post_lifts').select('id, post_id, created_at').eq('user_id', auth.user.id).order('created_at', { ascending: false }).limit(50),
    auth.supabase
      .from('training_requests')
      .select('id, requester_id, target_id, status, created_at')
      .or(`requester_id.eq.${auth.user.id},target_id.eq.${auth.user.id}`)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (likesError) return jsonError(likesError.message, 400);
  if (savedError) return jsonError(savedError.message, 400);
  if (commentsError) return jsonError(commentsError.message, 400);
  if (liftsError) return jsonError(liftsError.message, 400);

  return jsonOk({
    liked_posts: likesData || [],
    saved_posts: savedData || [],
    comments: commentsData || [],
    lifted_posts: liftsData || [],
    matches: matchError ? [] : matchData || [],
  });
}
