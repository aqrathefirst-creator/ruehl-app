import { jsonError, jsonOk } from '@/lib/server/responses';
import { createServiceRoleSupabase, requireUser } from '@/lib/server/supabase';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export async function GET(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const username = (url.searchParams.get('username') || '').trim().toLowerCase();

  if (!USERNAME_PATTERN.test(username)) {
    return jsonError('Invalid username format', 400);
  }

  const admin = createServiceRoleSupabase();
  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .limit(1)
    .maybeSingle();

  if (error) return jsonError(error.message, 400);

  const available = !data || data.id === auth.user.id;
  return jsonOk({ available });
}
