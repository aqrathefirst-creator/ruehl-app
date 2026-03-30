import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';

type AccountUpdatePayload = {
  username?: string;
  bio?: string;
  avatar_url?: string | null;
  email?: string;
  password?: string;
};

function sanitizeText(value: string, max: number) {
  return value.trim().slice(0, max);
}

export async function PATCH(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as AccountUpdatePayload | null;
  if (!body) return jsonError('Invalid body', 400);

  const profileUpdates: Record<string, string | null> = {};

  if (typeof body.username === 'string') {
    const username = sanitizeText(body.username, 24);
    if (username.length < 3) return jsonError('Username must be at least 3 characters', 400);
    profileUpdates.username = username;
  }

  if (typeof body.bio === 'string') {
    profileUpdates.bio = sanitizeText(body.bio, 280);
  }

  if (typeof body.avatar_url === 'string' || body.avatar_url === null) {
    profileUpdates.avatar_url = body.avatar_url;
  }

  if (profileUpdates.username) {
    const { data: duplicate } = await auth.supabase
      .from('profiles')
      .select('id')
      .neq('id', auth.user.id)
      .ilike('username', profileUpdates.username)
      .maybeSingle();

    if (duplicate) return jsonError('Username is already taken', 409);
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileUpdateError } = await auth.supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', auth.user.id);

    if (profileUpdateError) return jsonError(profileUpdateError.message, 400);
  }

  if (typeof body.email === 'string' || typeof body.password === 'string') {
    const authUpdates: { email?: string; password?: string } = {};

    if (typeof body.email === 'string') {
      const email = body.email.trim().toLowerCase();
      if (!email.includes('@')) return jsonError('Invalid email address', 400);
      authUpdates.email = email;
    }

    if (typeof body.password === 'string') {
      if (body.password.length < 8) return jsonError('Password must be at least 8 characters', 400);
      authUpdates.password = body.password;
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authUpdateError } = await auth.supabase.auth.updateUser(authUpdates);
      if (authUpdateError) return jsonError(authUpdateError.message, 400);
    }
  }

  const { data: profile, error } = await auth.supabase
    .from('profiles')
    .select('id, username, bio, avatar_url, is_verified')
    .eq('id', auth.user.id)
    .single();

  if (error) return jsonError(error.message, 400);

  return jsonOk({ profile });
}
