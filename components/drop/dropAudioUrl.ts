import { supabase } from '@/lib/supabase';
import {
  DROPS_AUDIO_PRIVATE_BUCKET,
  DROPS_AUDIO_PUBLIC_BUCKET,
  DROP_ECHOES_PRIVATE_BUCKET,
  DROP_ECHOES_PUBLIC_BUCKET,
} from '@/lib/ruehl/drops';

async function fetchSignedPrivate(bucket: string, path: string): Promise<string> {
  const p = path.trim();
  if (!p) return '';
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) return '';
  const res = await fetch('/api/storage/signed-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ bucket, path: p }),
  });
  if (!res.ok) return '';
  const j = (await res.json()) as { url?: string };
  return typeof j.url === 'string' ? j.url : '';
}

/** Master Drop audio — public CDN URL or one signed URL attempt for private storage. */
export async function resolveDropMainAudioUrl(
  path: string,
  visibility: 'public' | 'private',
): Promise<string> {
  const p = path.trim();
  if (!p) return '';
  if (visibility === 'public') {
    const { data } = supabase.storage.from(DROPS_AUDIO_PUBLIC_BUCKET).getPublicUrl(p);
    return typeof data.publicUrl === 'string' ? data.publicUrl : '';
  }
  return fetchSignedPrivate(DROPS_AUDIO_PRIVATE_BUCKET, p);
}

/** Echo clip — same pattern, separate buckets per native. */
export async function resolveEchoAudioUrl(path: string, visibility: 'public' | 'private'): Promise<string> {
  const p = path.trim();
  if (!p) return '';
  if (visibility === 'public') {
    const { data } = supabase.storage.from(DROP_ECHOES_PUBLIC_BUCKET).getPublicUrl(p);
    return typeof data.publicUrl === 'string' ? data.publicUrl : '';
  }
  return fetchSignedPrivate(DROP_ECHOES_PRIVATE_BUCKET, p);
}
