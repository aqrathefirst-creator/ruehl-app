import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

export async function GET(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const query = url.searchParams.get('query')?.trim() || '';

  let soundsQuery = auth.admin
    .from('sounds')
    .select('id, track_name, artist_name, thumbnail_url, preview_url, usage_count, is_enabled, is_trending, category, created_at')
    .order('usage_count', { ascending: false })
    .limit(200);

  if (query) {
    soundsQuery = soundsQuery.or(`track_name.ilike.%${query}%,artist_name.ilike.%${query}%`);
  }

  const { data, error } = await soundsQuery;
  if (error) return jsonError(error.message, 400);

  return jsonOk({ items: data || [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as {
    track_name?: string;
    artist_name?: string;
    preview_url?: string | null;
    thumbnail_url?: string | null;
    category?: string | null;
  } | null;

  const trackName = body?.track_name?.trim();
  const artistName = body?.artist_name?.trim();
  if (!trackName || !artistName) return jsonError('track_name and artist_name are required', 400);

  const { data, error } = await auth.admin
    .from('sounds')
    .insert({
      track_name: trackName,
      artist_name: artistName,
      preview_url: body?.preview_url || null,
      thumbnail_url: body?.thumbnail_url || null,
      category: body?.category || null,
      usage_count: 0,
      is_enabled: true,
      is_trending: false,
    })
    .select('id, track_name, artist_name, preview_url, thumbnail_url, category, usage_count, is_enabled, is_trending, created_at')
    .single();

  if (error) return jsonError(error.message, 400);
  return jsonOk({ item: data }, 201);
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    is_enabled?: boolean;
    is_trending?: boolean;
    category?: string | null;
  } | null;

  const id = body?.id?.trim();
  if (!id) return jsonError('id is required', 400);

  const patch: Record<string, unknown> = {};
  if (typeof body?.is_enabled === 'boolean') patch.is_enabled = body.is_enabled;
  if (typeof body?.is_trending === 'boolean') patch.is_trending = body.is_trending;
  if (body?.category !== undefined) patch.category = body.category;

  if (Object.keys(patch).length === 0) return jsonError('No patch fields supplied', 400);

  const { error } = await auth.admin.from('sounds').update(patch).eq('id', id);
  if (error) return jsonError(error.message, 400);

  return jsonOk({ success: true });
}
