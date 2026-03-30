import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';

export async function GET(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { data, error } = await auth.supabase
    .from('likes')
    .select(
      `
      id,
      created_at,
      post:posts (
        id,
        user_id,
        content,
        media_url,
        created_at
      )
    `
    )
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) return jsonError(error.message, 400);

  return jsonOk({ items: data || [] });
}
