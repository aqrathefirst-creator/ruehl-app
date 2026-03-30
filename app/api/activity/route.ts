import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';

// Backward-compatible API names requested in spec:
// - fetchLikedPosts(user_id)
// - fetchSavedPosts(user_id)
// - fetchUserActivity(user_id)
export async function GET(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const userId = url.searchParams.get('user_id');

  if (!action || !userId) {
    return jsonError('action and user_id are required', 400);
  }

  if (userId !== auth.user.id) {
    return jsonError('Forbidden', 403);
  }

  if (action === 'fetchLikedPosts') {
    const { data, error } = await auth.supabase.rpc('fetch_liked_posts', {
      target_user_id: userId,
    });
    if (error) return jsonError(error.message, 400);
    return jsonOk({ items: data || [] });
  }

  if (action === 'fetchSavedPosts') {
    const { data, error } = await auth.supabase.rpc('fetch_saved_posts', {
      target_user_id: userId,
    });
    if (error) return jsonError(error.message, 400);
    return jsonOk({ items: data || [] });
  }

  if (action === 'fetchUserActivity') {
    const { data, error } = await auth.supabase.rpc('fetch_user_activity', {
      target_user_id: userId,
    });
    if (error) return jsonError(error.message, 400);
    return jsonOk({ activity: data || {} });
  }

  return jsonError('Invalid action', 400);
}
