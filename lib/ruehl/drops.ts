/**
 * Types and constants only — ported from `ruehl-native/lib/drops.ts`.
 *
 * Web renders Drops **view-only** per WEB_DIRECTION.md §4 (no composer / recording logic here).
 *
 * Mirrors `public.drops`, `drop_tune_ins`, `drop_echoes`, and storage buckets
 * (`20260419000002_drops_system.sql`).
 *
 * Omitted vs native (web Phase scope): `DropInput`, `DropEchoInput`, and any future composer-only types.
 */

import type { AccountType, AccountCategory } from './accountTypes';

/** Matches CHECK / product state machine on `public.drops.status` — native exact values. */
export type DropStatus = 'scheduled' | 'live' | 'ended' | 'posted' | 'archived' | 'expired';

export type DropPostWindowChoice = 'posted' | 'archived' | 'expired';

/** Row shape matching `public.drops` (camelCase client projection). */
export type Drop = {
  id: string;
  creatorId: string;
  accountType: AccountType;
  accountCategory: AccountCategory;
  audioPath: string;
  durationSeconds: number;
  caption: string | null;
  scheduledFor: string; // ISO datetime
  status: DropStatus;
  postWindowChoice: DropPostWindowChoice | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  windowClosedAt: string | null;
};

/** Row shape matching `public.drop_tune_ins`. */
export type DropTuneIn = {
  userId: string;
  creatorId: string;
  tunedInAt: string;
};

/** Row shape matching `public.drop_echoes` (voice during live window). */
export type DropEcho = {
  id: string;
  dropId: string;
  userId: string;
  parentEchoId: string | null;
  audioPath: string;
  durationSeconds: number;
  isCreatorResponse: boolean;
  createdAt: string;
};

export const DROPS_AUDIO_BUCKET = 'drop-audio';
export const DROP_ECHOES_BUCKET = 'drop-echoes';

/** Live window length in minutes after `scheduled_for`. */
export const DROP_LIVE_WINDOW_MINUTES = 30;

/**
 * Schedule constraints (min and max lead time from “now” at schedule time).
 * **Min 0** = may schedule immediately after now (per resolved product session; `NATIVE_SPEC` / client `isValidScheduleTime`).
 */
export const DROP_SCHEDULE_MIN_LEAD_MINUTES = 0;

/** Upper bound for how far ahead a Drop may be scheduled (product cap — matches native `drops.ts`). */
export const DROP_SCHEDULE_MAX_LEAD_DAYS = 365;

/** Max echo duration in seconds (Drop Echo thread during live window). */
export const DROP_ECHO_MAX_DURATION_SECONDS = 60;

/** Creator's voice response cap per Drop (matches DB trigger in `20260419000002_drops_system.sql`). */
export const DROP_CREATOR_RESPONSE_CAP = 5;

/** Drop lifetime after the live window before auto-expire if creator doesn't choose (24h). */
export const DROP_POST_WINDOW_DECISION_HOURS = 24;

/** Duration ranges by account type (seconds). Match `drops_duration_within_account_type_limit`. */
export const DROP_DURATION_RANGES: Record<'personal' | 'business' | 'media', { min: number; max: number }> = {
  personal: { min: 60, max: 90 },
  business: { min: 10, max: 45 },
  media: { min: 10, max: 90 },
};

/** Audio file size limit for drops (50 MB; matches bucket config). */
export const DROP_AUDIO_MAX_BYTES = 50 * 1024 * 1024;

/** Audio file size limit for echoes (25 MB; matches bucket config). */
export const DROP_ECHO_MAX_BYTES = 25 * 1024 * 1024;

/** Allowed audio MIME types for Drop/Echo audio (match bucket config). */
export const DROP_AUDIO_ALLOWED_MIME_TYPES: readonly string[] = [
  'audio/mpeg',
  'audio/m4a',
  'audio/mp4',
  'audio/aac',
  'audio/x-m4a',
  'audio/wav',
] as const;

const DROP_STATUSES: readonly DropStatus[] = [
  'scheduled',
  'live',
  'ended',
  'posted',
  'archived',
  'expired',
] as const;

const DROP_POST_CHOICES: readonly DropPostWindowChoice[] = ['posted', 'archived', 'expired'] as const;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Returns true when drop is currently in its live window. */
export function isDropLive(status: DropStatus): boolean {
  return status === 'live';
}

/** Returns true for any status where the drop's live window is over. */
export function isDropPastWindow(status: DropStatus): boolean {
  return status === 'ended' || status === 'posted' || status === 'archived' || status === 'expired';
}

/** Returns true when a drop's content is still publicly visible (live/ended/posted/archived). */
export function isDropVisible(status: DropStatus): boolean {
  return status === 'live' || status === 'ended' || status === 'posted' || status === 'archived';
}

/** Returns true only when creator still needs to make the Wrap Up choice. */
export function needsWrapUpDecision(status: DropStatus, postWindowChoice: DropPostWindowChoice | null): boolean {
  return status === 'ended' && postWindowChoice === null;
}

/** Computes window end: `scheduledFor` + {@link DROP_LIVE_WINDOW_MINUTES}. */
export function getDropWindowEnd(scheduledFor: Date | string): Date {
  const d = toDate(scheduledFor);
  return new Date(d.getTime() + DROP_LIVE_WINDOW_MINUTES * 60 * 1000);
}

/** Returns true if `now` is within `[startedAt, windowEnd]`. Accepts strings or Dates. */
export function isNowInLiveWindow(
  scheduledFor: Date | string,
  startedAt: Date | string | null,
  now?: Date,
): boolean {
  if (startedAt === null) return false;
  const t = now ?? new Date();
  const start = toDate(startedAt);
  const end = getDropWindowEnd(scheduledFor);
  const tMs = t.getTime();
  return tMs >= start.getTime() && tMs <= end.getTime();
}

/** Returns time remaining in live window in seconds. Negative if past, 0 if not started. */
export function liveWindowSecondsRemaining(
  scheduledFor: Date | string,
  startedAt: Date | string | null,
  now?: Date,
): number {
  if (startedAt === null) return 0;
  const t = now ?? new Date();
  const start = toDate(startedAt);
  const end = getDropWindowEnd(scheduledFor);
  const tMs = t.getTime();
  if (tMs < start.getTime()) return 0;
  return (end.getTime() - tMs) / 1000;
}

/** Returns time until `scheduled_for` in seconds. Negative if past. */
export function secondsUntilScheduled(scheduledFor: Date | string, now?: Date): number {
  const scheduled = toDate(scheduledFor);
  const n = now ?? new Date();
  return (scheduled.getTime() - n.getTime()) / 1000;
}

/** Validates a Drop duration against the tier's allowed range. */
export function isValidDropDuration(accountType: 'personal' | 'business' | 'media', durationSeconds: number): boolean {
  const { min, max } = DROP_DURATION_RANGES[accountType];
  return durationSeconds >= min && durationSeconds <= max;
}

/** Validates an Echo duration (> 0 and ≤ {@link DROP_ECHO_MAX_DURATION_SECONDS}). */
export function isValidEchoDuration(durationSeconds: number): boolean {
  return durationSeconds > 0 && durationSeconds <= DROP_ECHO_MAX_DURATION_SECONDS;
}

/**
 * Validates `scheduled_for` is strictly in the future and within the max lead window from now.
 * **Note:** DB migration may enforce a tighter minimum lead than 0 minutes — see `NATIVE_SPEC.md` §3928.
 */
export function isValidScheduleTime(scheduledFor: Date | string, now?: Date): boolean {
  const scheduled = toDate(scheduledFor);
  const n = now ?? new Date();
  if (scheduled.getTime() <= n.getTime()) return false;
  const maxTime = new Date(n.getTime() + DROP_SCHEDULE_MAX_LEAD_DAYS * 24 * 60 * 60 * 1000);
  return scheduled.getTime() <= maxTime.getTime();
}

/** Validates a MIME type against the audio bucket allowed list. */
export function isAllowedDropAudioMimeType(mime: string): boolean {
  return (DROP_AUDIO_ALLOWED_MIME_TYPES as readonly string[]).includes(mime.trim());
}

function buildUserScopedAudioPath(userId: string, fileExtension: string): string {
  const ext = fileExtension.replace(/^\./u, '').toLowerCase() || 'm4a';
  return `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
}

/** Builds a storage object path for a Drop's audio file. */
export function buildDropAudioPath(userId: string, fileExtension: string): string {
  return buildUserScopedAudioPath(userId, fileExtension);
}

/** Builds a storage object path for a Drop Echo's audio file. */
export function buildEchoAudioPath(userId: string, fileExtension: string): string {
  return buildUserScopedAudioPath(userId, fileExtension);
}

/** Safely parses an unknown value into DropStatus or null. */
export function parseDropStatus(raw: unknown): DropStatus | null {
  if (typeof raw !== 'string') return null;
  return (DROP_STATUSES as readonly string[]).includes(raw) ? (raw as DropStatus) : null;
}

/** Safely parses an unknown value into DropPostWindowChoice or null. */
export function parseDropPostWindowChoice(raw: unknown): DropPostWindowChoice | null {
  if (typeof raw !== 'string') return null;
  return (DROP_POST_CHOICES as readonly string[]).includes(raw) ? (raw as DropPostWindowChoice) : null;
}
