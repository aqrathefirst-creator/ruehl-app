'use client';

import { useCallback, useState } from 'react';
import FeedPostCard from '@/components/home/FeedPostCard';
import type { SavedFeedItem } from '@/lib/ruehl/queries/saved';

type Props = {
  initial: SavedFeedItem[];
};

export default function SavedList({ initial }: Props) {
  const [items, setItems] = useState<SavedFeedItem[]>(initial);
  const [nextOffset, setNextOffset] = useState(30);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initial.length === 30);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/saved?offset=${nextOffset}&limit=30`);
      if (!res.ok) {
        setHasMore(false);
        return;
      }
      const next = (await res.json()) as SavedFeedItem[] | { error?: string };
      if (!Array.isArray(next)) {
        setHasMore(false);
        return;
      }
      if (next.length < 30) setHasMore(false);
      setItems((prev) => [...prev, ...next]);
      setNextOffset((o) => o + 30);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, nextOffset]);

  const empty = items.length === 0;

  return (
    <>
      {empty ? (
        <div className="py-16 text-center text-zinc-500">
          <p>Nothing saved yet.</p>
          <p className="mt-2 text-sm">Save posts in the Ruehl app to see them here.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-4">
            {items.map((item, i) => (
              <li key={`${item.post.id}-${i}`}>
                <FeedPostCard item={item} />
              </li>
            ))}
          </ul>

          {hasMore ? (
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
      )}
    </>
  );
}
