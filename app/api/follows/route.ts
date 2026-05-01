import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';
import { createServerSupabase } from '@/lib/server/supabaseServer';
import { getFollowersOf, getFollowingOf } from '@/lib/ruehl/queries/follows';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')?.trim();
  const type = req.nextUrl.searchParams.get('type') ?? 'followers';
  const offset = Math.max(0, Number.parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10) || 0);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10) || 20));

  if (!userId) {
    return jsonError('userId is required', 400);
  }

  const supabase = await createServerSupabase();
  const fn = type === 'following' ? getFollowingOf : getFollowersOf;
  try {
    const items = await fn(userId, offset, limit, supabase);
    return jsonOk(items);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not load follow list';
    return jsonError(msg, 400);
  }
}

export async function POST(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as { following_id?: string } | null;
  const followingId = body?.following_id?.trim();

  if (!followingId) return jsonError('following_id is required', 400);
  if (followingId === auth.user.id) return jsonError('You cannot follow yourself', 400);

  const { data: existing } = await auth.supabase
    .from('follows')
    .select('id, follower_id, following_id, created_at')
    .eq('follower_id', auth.user.id)
    .eq('following_id', followingId)
    .maybeSingle();

  if (existing) return jsonOk({ item: existing });

  const { data, error } = await auth.supabase
    .from('follows')
    .insert({ follower_id: auth.user.id, following_id: followingId })
    .select('id, follower_id, following_id, created_at')
    .single();

  if (error) return jsonError(error.message, 400);

  return jsonOk({ item: data }, 201);
}

export async function DELETE(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const followingId = url.searchParams.get('following_id')?.trim();

  if (!followingId) return jsonError('following_id query param is required', 400);

  const { error } = await auth.supabase
    .from('follows')
    .delete()
    .eq('follower_id', auth.user.id)
    .eq('following_id', followingId);

  if (error) return jsonError(error.message, 400);

  return jsonOk({ success: true });
}