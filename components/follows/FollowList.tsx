'use client';

import { useCallback, useState } from 'react';
import FollowRow from '@/components/follows/FollowRow';
import type { FollowListItem } from '@/lib/ruehl/queries/follows';

const PAGE = 20;

type Props = {
  targetUserId: string;
  listType: 'followers' | 'following';
  initial: FollowListItem[];
};

export default function FollowList({ targetUserId, listType, initial }: Props) {
  const [items, setItems] = useState(initial);
  const [offset, setOffset] = useState(initial.length);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initial.length === PAGE);

  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        userId: targetUserId,
        type: listType,
        offset: String(offset),
        limit: String(PAGE),
      });
      const res = await fetch(`/api/follows?${params.toString()}`, { credentials: 'same-origin' });
      if (!res.ok) {
        setHasMore(false);
        return;
      }
      const next = (await res.json()) as FollowListItem[];
      if (!Array.isArray(next) || next.length === 0) {
        setHasMore(false);
        return;
      }
      setItems((prev) => [...prev, ...next]);
      setOffset((o) => o + next.length);
      if (next.length < PAGE) setHasMore(false);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, offset, targetUserId, listType]);

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-zinc-500">
        {listType === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {items.map((u) => (
          <li key={u.id}>
            <FollowRow user={u} />
          </li>
        ))}
      </ul>

      {hasMore ? (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-zinc-900 py-3 font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </>
  );
}
