'use client';

import { useCallback, useRef, useState } from 'react';
import NotificationRow from '@/components/notifications/NotificationRow';
import type { NotificationItem } from '@/lib/ruehl/queries/notifications';

const PAGE = 30;

type Props = {
  initial: NotificationItem[];
};

export default function NotificationsInbox({ initial }: Props) {
  const [items, setItems] = useState<NotificationItem[]>(initial);
  const [offset, setOffset] = useState(initial.length);
  const [hasMore, setHasMore] = useState(initial.length === PAGE);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?offset=${offset}&limit=${PAGE}`, {
        method: 'GET',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        setHasMore(false);
        return;
      }
      const next = (await res.json()) as NotificationItem[];
      if (!Array.isArray(next) || next.length === 0) {
        setHasMore(false);
        return;
      }
      setItems((prev) => [...prev, ...next]);
      setOffset((o) => o + next.length);
      if (next.length < PAGE) setHasMore(false);
    } catch (e) {
      console.error('Load more failed:', e);
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [offset]);

  const handleMarkAllRead = useCallback(async () => {
    if (marking) return;
    setMarking(true);
    try {
      const res = await fetch('/api/notifications/mark-all-read', { method: 'POST', credentials: 'same-origin' });
      if (!res.ok) return;
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error('Mark all read failed:', e);
    } finally {
      setMarking(false);
    }
  }, [marking]);

  const handleRowActivate = useCallback((notificationId: string) => {
    setItems((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
    void fetch(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
      credentials: 'same-origin',
    }).catch(() => {});
  }, []);

  const hasUnread = items.some((n) => !n.read);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Notifications</h1>
        {hasUnread ? (
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={marking}
            className="shrink-0 text-sm text-zinc-400 transition hover:text-white disabled:opacity-50"
          >
            {marking ? 'Marking…' : 'Mark all as read'}
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center text-zinc-500">
          <p>No notifications yet.</p>
          <p className="mt-2 text-sm">Activity from people you follow will show up here.</p>
        </div>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <NotificationRow notification={item} onActivate={() => handleRowActivate(item.id)} />
            </li>
          ))}
        </ul>
      )}

      {hasMore && items.length > 0 ? (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-zinc-900 py-3 font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </>
  );
}
