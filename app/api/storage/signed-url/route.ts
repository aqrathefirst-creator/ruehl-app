import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';

const SIGNED_URL_TTL_SEC = 3600;

const ALLOWED_BUCKETS = new Set(['post-media-private', 'post-voice-private']);

/** True if `path` is owned by `userId` for the given bucket (no path traversal). */
function pathAllowedForUser(bucket: string, path: string, userId: string): boolean {
  if (path.includes('..') || path.startsWith('/') || path.includes('//')) return false;

  if (bucket === 'post-media-private') {
    return path.startsWith(`posts/${userId}-`);
  }

  if (bucket === 'post-voice-private') {
    return path.startsWith(`${userId}/`) || path.startsWith(`posts/${userId}-`);
  }

  return false;
}

/**
 * POST { bucket, path } → { url, expiresAt }
 * Authenticated users only; path must be user-scoped for the allowlisted private buckets.
 */
export async function POST(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as { bucket?: string; path?: string } | null;
  const bucket = body?.bucket?.trim();
  const objectPath = body?.path?.trim();
  if (!bucket || !objectPath) return jsonError('bucket and path are required', 400);
  if (!ALLOWED_BUCKETS.has(bucket)) return jsonError('Invalid bucket', 400);
  if (!pathAllowedForUser(bucket, objectPath, auth.user.id)) return jsonError('Forbidden', 403);

  const { data, error } = await auth.supabase.storage.from(bucket).createSignedUrl(objectPath, SIGNED_URL_TTL_SEC);
  if (error) return jsonError(error.message, 400);
  if (!data?.signedUrl) return jsonError('Unable to create signed URL', 500);

  return jsonOk({
    url: data.signedUrl,
    expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SEC * 1000).toISOString(),
  });
}
