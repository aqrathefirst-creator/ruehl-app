'use client';

import { useCallback, useState } from 'react';
import FeedDropCard from '@/components/home/FeedDropCard';
import FeedPostCard from '@/components/home/FeedPostCard';
import type { NowFeedItem } from '@/lib/ruehl/queries/nowFeed';

const PAGE = 20;

type Props = {
  initial: NowFeedItem[];
};

export default function NowFeedClient({ initial }: Props) {
  const [items, setItems] = useState<NowFeedItem[]>(initial);
  const [offset, setOffset] = useState(initial.length);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initial.length === PAGE);

  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/now-feed?offset=${offset}&limit=${PAGE}`, {
        method: 'GET',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        setHasMore(false);
        return;
      }
      const next = (await res.json()) as NowFeedItem[];
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
  }, [loading, offset]);

  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-zinc-500">
        <p className="mb-2">No posts in your feed yet.</p>
        <p className="text-sm">Follow people to see their posts here.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={`${item.type}-${item.id}`}>
            {item.type === 'post' ? <FeedPostCard item={item} /> : <FeedDropCard item={item} />}
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
