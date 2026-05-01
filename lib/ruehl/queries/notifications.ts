/**
 * In-app notifications list — maps `public.notifications` rows for Path D web.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { BadgeVerificationStatus } from '@/lib/ruehl/accountTypes';
import { getProfile } from '@/lib/ruehl/queries/profile';

export type NotificationActor = {
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  badge_verification_status: BadgeVerificationStatus | null;
};

export type NotificationItem = {
  id: string;
  /** DB enum `notifications.kind`, serialized as string */
  kind: string;
  actor_id: string | null;
  actor: NotificationActor | null;
  target_type: 'post' | 'drop' | 'profile' | 'message' | null;
  target_id: string | null;
  target_preview: string | null;
  /** Derived: true when `read_at` is non-null */
  read: boolean;
  created_at: string;
};

function previewFromData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  for (const k of ['preview', 'body', 'snippet', 'text', 'message']) {
    const v = d[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function deriveTarget(row: Record<string, unknown>): {
  target_type: NotificationItem['target_type'];
  target_id: string | null;
} {
  const post = row.target_post_id;
  if (post != null && String(post).trim()) {
    return { target_type: 'post', target_id: String(post) };
  }
  const drop = row.target_drop_id;
  if (drop != null && String(drop).trim()) {
    return { target_type: 'drop', target_id: String(drop) };
  }
  const user = row.target_user_id;
  if (user != null && String(user).trim()) {
    return { target_type: 'profile', target_id: String(user) };
  }
  const msg = row.target_message_id;
  if (msg != null && String(msg).trim()) {
    return { target_type: 'message', target_id: String(msg) };
  }
  return { target_type: null, target_id: null };
}

export async function getNotifications(
  userId: string,
  offset: number,
  limit: number,
  client: SupabaseClient,
): Promise<NotificationItem[]> {
  const uid = String(userId || '').trim();
  if (!uid) return [];

  const safeLimit = Math.min(Math.max(1, limit), 50);
  const start = Math.max(0, offset);
  const end = start + safeLimit - 1;

  const { data: rows, error } = await client
    .from('notifications')
    .select('*')
    .eq('recipient_id', uid)
    .order('created_at', { ascending: false })
    .range(start, end);

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[notifications]', error.message);
    }
    return [];
  }
  if (!rows?.length) return [];

  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean) as string[])];

  const actorMap = new Map<string, NotificationActor>();
  await Promise.all(
    actorIds.map(async (id) => {
      const profile = await getProfile(id, client).catch(() => null);
      if (profile) {
        actorMap.set(id, {
          username: profile.username,
          avatar_url: profile.avatar_url,
          is_verified: profile.is_verified ?? null,
          badge_verification_status: profile.badge_verification_status ?? null,
        });
      }
    }),
  );

  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    const actorId = row.actor_id == null ? null : String(row.actor_id);
    const readAt = row.read_at;
    const read = readAt != null && String(readAt).length > 0;
    const { target_type, target_id } = deriveTarget(row);
    const preview = previewFromData(row.data);

    return {
      id: String(row.id ?? ''),
      kind: String(row.kind ?? 'unknown'),
      actor_id: actorId,
      actor: actorId ? actorMap.get(actorId) ?? null : null,
      target_type,
      target_id,
      target_preview: preview,
      read,
      created_at: row.created_at == null ? '' : String(row.created_at),
    };
  });
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
  client: SupabaseClient,
): Promise<void> {
  const now = new Date().toISOString();
  await client
    .from('notifications')
    .update({ read_at: now })
    .eq('id', notificationId)
    .eq('recipient_id', userId);
}

export async function markAllNotificationsRead(userId: string, client: SupabaseClient): Promise<void> {
  const now = new Date().toISOString();
  await client.from('notifications').update({ read_at: now }).eq('recipient_id', userId).is('read_at', null);
}
