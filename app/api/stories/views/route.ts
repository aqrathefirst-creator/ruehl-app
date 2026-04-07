import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';

type StoryViewPayload = {
  story_id?: string;
};

export async function GET(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { data, error } = await auth.supabase
    .from('story_views')
    .select('story_id, viewed_at')
    .eq('viewer_id', auth.user.id)
    .order('viewed_at', { ascending: false })
    .limit(500);

  if (error) return jsonError(error.message, 400);

  return jsonOk({ items: data || [] });
}

export async function POST(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as StoryViewPayload | null;
  const storyId = body?.story_id?.trim();

  if (!storyId) return jsonError('story_id is required', 400);

  const { data, error } = await auth.supabase
    .from('story_views')
    .upsert(
      {
        story_id: storyId,
        viewer_id: auth.user.id,
        viewed_at: new Date().toISOString(),
      },
      { onConflict: 'story_id,viewer_id' }
    )
    .select('id, story_id, viewer_id, viewed_at')
    .single();

  if (error) return jsonError(error.message, 400);

  return jsonOk({ item: data }, 201);
}
