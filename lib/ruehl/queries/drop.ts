/**
 * Single-drop reads for `/drop/[id]` — mirrors native `getDropWithEchoes` + lift aggregates.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountCategory, AccountType } from '@/lib/ruehl/accountTypes';
import { CATEGORIES_BY_TYPE } from '@/lib/ruehl/accountTypes';
import { parseDropPostWindowChoice, parseDropStatus, type Drop } from '@/lib/ruehl/drops';
import { getProfile } from '@/lib/ruehl/queries/profile';
import type { RuehlProfile } from '@/lib/ruehl/types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUuid(raw: unknown): string | null {
  const s = typeof raw === 'string' ? raw.trim() : '';
  return UUID_RE.test(s) ? s : null;
}

function parseAccountType(raw: unknown): AccountType | null {
  const s = String(raw || '')
    .trim()
    .toLowerCase();
  if (s === 'personal' || s === 'business' || s === 'media') return s;
  const u = String(raw || '').trim().toUpperCase();
  if (u === 'PERSONAL') return 'personal';
  if (u === 'BUSINESS') return 'business';
  if (u === 'MEDIA') return 'media';
  return null;
}

function parseAccountSubtype(tier: AccountType, raw: unknown): AccountCategory {
  const s = String(raw || '')
    .trim()
    .toLowerCase();
  const allowed = CATEGORIES_BY_TYPE[tier];
  if ((allowed as readonly string[]).includes(s)) return s as AccountCategory;
  return allowed[0];
}

function mapDropRow(row: Record<string, unknown>): Drop | null {
  const id = parseUuid(row.id);
  const creatorId = parseUuid(row.creator_id);
  const tier = parseAccountType(row.account_type);
  const audioPath = typeof row.audio_path === 'string' ? row.audio_path.trim() : '';
  const audioVisibility: 'public' | 'private' = row.audio_visibility === 'private' ? 'private' : 'public';
  const durationRaw = row.duration_seconds;
  const durationSeconds =
    typeof durationRaw === 'number'
      ? durationRaw
      : typeof durationRaw === 'string'
        ? Number.parseFloat(durationRaw)
        : NaN;
  const caption = row.caption === null || typeof row.caption === 'string' ? (row.caption as string | null) : null;
  const scheduledFor =
    typeof row.scheduled_for === 'string'
      ? row.scheduled_for
      : typeof row.created_at === 'string'
        ? row.created_at
        : null;
  const status = parseDropStatus(row.status);
  const postWindowChoice = parseDropPostWindowChoice(row.post_window_choice);
  const createdAt = typeof row.created_at === 'string' ? row.created_at : null;
  const startedAt =
    row.started_at === null || typeof row.started_at === 'string' ? (row.started_at as string | null) : null;
  const endedAt = row.ended_at === null || typeof row.ended_at === 'string' ? (row.ended_at as string | null) : null;
  const windowClosedAt =
    row.window_closed_at === null || typeof row.window_closed_at === 'string'
      ? (row.window_closed_at as string | null)
      : null;

  if (
    !id ||
    !creatorId ||
    !audioPath ||
    !Number.isFinite(durationSeconds) ||
    !scheduledFor ||
    !status ||
    !createdAt ||
    !tier
  ) {
    return null;
  }

  const accountSubtype = parseAccountSubtype(tier, row.account_subtype);

  return {
    id,
    creatorId,
    accountType: tier,
    accountSubtype,
    audioPath,
    audioVisibility,
    durationSeconds,
    caption,
    scheduledFor,
    status,
    postWindowChoice,
    createdAt,
    startedAt,
    endedAt,
    windowClosedAt,
  };
}

export type DropEchoListItem = {
  id: string;
  dropId: string;
  userId: string;
  audioPath: string;
  audioVisibility: 'public' | 'private';
  durationSeconds: number;
  createdAt: string | null;
  author: RuehlProfile | null;
};

export type DropDetailPageData = {
  drop: Drop & { liftCount: number };
  author: RuehlProfile | null;
  echoes: DropEchoListItem[];
  echoCount: number;
  viewerLifted: boolean;
};

export async function getDropById(dropId: string, client: SupabaseClient): Promise<DropDetailPageData | null> {
  const id = String(dropId || '').trim();
  if (!id) return null;

  const { data: row, error } = await client.from('drops').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!row || typeof row !== 'object') return null;

  const mapped = mapDropRow(row as Record<string, unknown>);
  if (!mapped) return null;

  const creatorId = mapped.creatorId;

  const [author, liftAgg, echoesRes, authRes] = await Promise.all([
    getProfile(creatorId, client),
    client.from('drop_lifts').select('id', { count: 'exact', head: true }).eq('drop_id', id),
    client
      .from('drop_echoes')
      .select('id, drop_id, user_id, audio_path, audio_visibility, duration_seconds, created_at')
      .eq('drop_id', id)
      .order('created_at', { ascending: true }),
    client.auth.getUser(),
  ]);

  const liftCount = liftAgg.error ? 0 : liftAgg.count ?? 0;

  const uid = authRes.data.user?.id ?? null;
  let viewerLifted = false;
  if (uid) {
    const { data: liftRow } = await client
      .from('drop_lifts')
      .select('id')
      .eq('drop_id', id)
      .eq('user_id', uid)
      .maybeSingle();
    viewerLifted = Boolean(liftRow);
  }

  const echoRows = (echoesRes.error ? [] : echoesRes.data ?? []) as Record<string, unknown>[];
  const echoerIds = [...new Set(echoRows.map((r) => parseUuid(r.user_id)).filter((x): x is string => Boolean(x)))];

  const profilesById = new Map<string, RuehlProfile | null>();
  await Promise.all(
    echoerIds.map(async (eid) => {
      const p = await getProfile(eid, client);
      profilesById.set(eid, p);
    }),
  );

  const echoes: DropEchoListItem[] = echoRows.map((er) => {
    const eid = parseUuid(er.id) ?? '';
    const userId = parseUuid(er.user_id) ?? '';
    const audioPath = typeof er.audio_path === 'string' ? er.audio_path : '';
    const audioVisibility: 'public' | 'private' = er.audio_visibility === 'private' ? 'private' : 'public';
    const durRaw = er.duration_seconds;
    const durationSeconds =
      typeof durRaw === 'number' ? durRaw : typeof durRaw === 'string' ? Number.parseFloat(durRaw) : 0;
    const createdAt = typeof er.created_at === 'string' ? er.created_at : null;
    return {
      id: eid,
      dropId: id,
      userId,
      audioPath,
      audioVisibility,
      durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 0,
      createdAt,
      author: profilesById.get(userId) ?? null,
    };
  });

  return {
    drop: { ...mapped, liftCount },
    author,
    echoes,
    echoCount: echoes.length,
    viewerLifted,
  };
}
