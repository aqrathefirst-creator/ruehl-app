import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';

type StoryPayload = {
  media_url?: string;
  content?: string;
};

export async function GET(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const nowIso = new Date().toISOString();

  const { data, error } = await auth.supabase
    .from('story_entries')
    .select('id, user_id, media_url, content, created_at, expires_at')
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return jsonError(error.message, 400);

  return jsonOk({ items: data || [] });
}

export async function POST(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as StoryPayload | null;
  const mediaUrl = body?.media_url?.trim();
  const content = body?.content?.trim() || '';

  if (!mediaUrl) return jsonError('media_url is required', 400);

  const { data, error } = await auth.supabase
    .from('story_entries')
    .insert({
      user_id: auth.user.id,
      media_url: mediaUrl,
      content,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id, user_id, media_url, content, created_at, expires_at')
    .single();

  if (error) return jsonError(error.message, 400);

  return jsonOk({ item: data }, 201);
}

export async function DELETE(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const storyId = url.searchParams.get('story_id')?.trim();

  if (!storyId) return jsonError('story_id query param is required', 400);

  const { error } = await auth.supabase
    .from('story_entries')
    .delete()
    .eq('id', storyId)
    .eq('user_id', auth.user.id);

  if (error) return jsonError(error.message, 400);

  return jsonOk({ success: true });
}
