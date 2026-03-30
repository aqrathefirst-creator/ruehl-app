import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';

type SettingsPayload = {
  is_private_account?: boolean;
  allow_messages_from?: 'everyone' | 'followers' | 'none';
  show_activity_status?: boolean;
  allow_tagging?: boolean;
  two_factor_enabled?: boolean;
};

function sanitize(payload: SettingsPayload) {
  const next: Record<string, boolean | string> = {};

  if (typeof payload.is_private_account === 'boolean') {
    next.is_private_account = payload.is_private_account;
  }

  if (
    payload.allow_messages_from === 'everyone' ||
    payload.allow_messages_from === 'followers' ||
    payload.allow_messages_from === 'none'
  ) {
    next.allow_messages_from = payload.allow_messages_from;
  }

  if (typeof payload.show_activity_status === 'boolean') {
    next.show_activity_status = payload.show_activity_status;
  }

  if (typeof payload.allow_tagging === 'boolean') {
    next.allow_tagging = payload.allow_tagging;
  }

  if (typeof payload.two_factor_enabled === 'boolean') {
    next.two_factor_enabled = payload.two_factor_enabled;
  }

  return next;
}

export async function GET(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { data, error } = await auth.supabase
    .from('profiles')
    .select('id, username, bio, avatar_url, is_private_account, allow_messages_from, show_activity_status, allow_tagging, two_factor_enabled, is_verified')
    .eq('id', auth.user.id)
    .single();

  if (error) return jsonError(error.message, 400);

  return jsonOk({ settings: data });
}

export async function PATCH(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as SettingsPayload | null;
  if (!body) return jsonError('Invalid body', 400);

  const updates = sanitize(body);
  if (Object.keys(updates).length === 0) {
    return jsonError('No valid settings fields provided', 400);
  }

  const { data, error } = await auth.supabase
    .from('profiles')
    .update(updates)
    .eq('id', auth.user.id)
    .select('id, username, bio, avatar_url, is_private_account, allow_messages_from, show_activity_status, allow_tagging, two_factor_enabled, is_verified')
    .single();

  if (error) return jsonError(error.message, 400);

  return jsonOk({ settings: data });
}
