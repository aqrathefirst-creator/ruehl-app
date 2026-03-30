import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';

export async function GET(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { data, error } = await auth.supabase
    .from('saved_posts')
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

export async function POST(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as { post_id?: string } | null;
  const postId = body?.post_id?.trim();

  if (!postId) return jsonError('post_id is required', 400);

  const { data, error } = await auth.supabase
    .from('saved_posts')
    .insert({ user_id: auth.user.id, post_id: postId })
    .select('id, user_id, post_id, created_at')
    .single();

  if (error) return jsonError(error.message, 400);

  return jsonOk({ item: data }, 201);
}

export async function DELETE(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const postId = url.searchParams.get('post_id')?.trim();

  if (!postId) return jsonError('post_id query param is required', 400);

  const { error } = await auth.supabase
    .from('saved_posts')
    .delete()
    .eq('user_id', auth.user.id)
    .eq('post_id', postId);

  if (error) return jsonError(error.message, 400);

  return jsonOk({ success: true });
}
