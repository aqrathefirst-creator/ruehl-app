import type { SupabaseClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';

const PROFILE_SELECT =
  'id, username, bio, avatar_url, allow_messages_from, show_activity_status, allow_tagging, two_factor_enabled, is_verified';

type SettingsPayload = {
  /** Privacy flag — stored on `public.users.is_private`, not profiles */
  is_private?: boolean;
  allow_messages_from?: 'everyone' | 'followers' | 'none';
  show_activity_status?: boolean;
  allow_tagging?: boolean;
  two_factor_enabled?: boolean;
};

function splitPayload(payload: SettingsPayload): {
  profile: Record<string, boolean | string>;
  user: Record<string, boolean>;
} {
  const profile: Record<string, boolean | string> = {};
  const user: Record<string, boolean> = {};

  if (typeof payload.is_private === 'boolean') {
    user.is_private = payload.is_private;
  }

  if (
    payload.allow_messages_from === 'everyone' ||
    payload.allow_messages_from === 'followers' ||
    payload.allow_messages_from === 'none'
  ) {
    profile.allow_messages_from = payload.allow_messages_from;
  }

  if (typeof payload.show_activity_status === 'boolean') {
    profile.show_activity_status = payload.show_activity_status;
  }

  if (typeof payload.allow_tagging === 'boolean') {
    profile.allow_tagging = payload.allow_tagging;
  }

  if (typeof payload.two_factor_enabled === 'boolean') {
    profile.two_factor_enabled = payload.two_factor_enabled;
  }

  return { profile, user };
}

async function getSettingsResponse(supabase: SupabaseClient, userId: string) {
  const [{ data: profile, error: pErr }, { data: userRow }] = await Promise.all([
    supabase.from('profiles').select(PROFILE_SELECT).eq('id', userId).single(),
    supabase.from('users').select('is_private, account_type, account_subtype').eq('id', userId).maybeSingle(),
  ]);

  if (pErr) throw new Error(pErr.message);

  const u = userRow as { is_private?: boolean; account_type?: unknown; account_subtype?: unknown } | null;
  const isPrivate = Boolean(u?.is_private);

  const rawType = String(u?.account_type ?? '').trim().toLowerCase();
  const account_type =
    rawType === 'personal' || rawType === 'business' || rawType === 'media' ? rawType : 'personal';

  const allowedSubtype = (() => {
    const sub = String(u?.account_subtype ?? '').trim().toLowerCase();
    const personal = ['personal', 'creator', 'artist', 'public_figure'];
    const business = ['brand', 'company', 'shop', 'restaurant'];
    const media = ['radio_station', 'magazine', 'podcast', 'publication'];
    const list =
      account_type === 'business' ? business : account_type === 'media' ? media : personal;
    return list.includes(sub) ? sub : list[0];
  })();

  return {
    settings: {
      ...(profile as Record<string, unknown>),
      is_private: isPrivate,
      account_type,
      account_subtype: allowedSubtype,
    },
  };
}

export async function GET(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  try {
    const out = await getSettingsResponse(auth.supabase, auth.user.id);
    return jsonOk(out);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to load settings';
    return jsonError(msg, 400);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as SettingsPayload | null;
  if (!body) return jsonError('Invalid body', 400);

  const { profile, user } = splitPayload(body);
  if (Object.keys(profile).length === 0 && Object.keys(user).length === 0) {
    return jsonError('No valid settings fields provided', 400);
  }

  if (Object.keys(user).length > 0) {
    const { error: uErr } = await auth.supabase.from('users').update(user).eq('id', auth.user.id);
    if (uErr) return jsonError(uErr.message, 400);
  }

  if (Object.keys(profile).length > 0) {
    const { error: pErr } = await auth.supabase.from('profiles').update(profile).eq('id', auth.user.id);
    if (pErr) return jsonError(pErr.message, 400);
  }

  try {
    const out = await getSettingsResponse(auth.supabase, auth.user.id);
    return jsonOk(out);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to load settings';
    return jsonError(msg, 400);
  }
}
