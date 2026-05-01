'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RuehlProfile } from '@/lib/ruehl/types';
import type { NowFeedItem } from '@/lib/ruehl/queries/nowFeed';
import FeedPostCard from '@/components/home/FeedPostCard';
import FeedDropCard from '@/components/home/FeedDropCard';
import SuggestionsRail from '@/components/explore/SuggestionsRail';

type Props = {
  initialFeed: NowFeedItem[];
  suggestions: RuehlProfile[];
};

export default function ExploreView({ initialFeed, suggestions }: Props) {
  const [items, setItems] = useState<NowFeedItem[]>(initialFeed);
  const [hasMore, setHasMore] = useState(initialFeed.length === 20);
  const [loading, setLoading] = useState(false);

  const offsetRef = useRef(initialFeed.length);
  const loadingRef = useRef(false);

  useEffect(() => {
    offsetRef.current = initialFeed.length;
    setItems(initialFeed);
    setHasMore(initialFeed.length === 20);
  }, [initialFeed]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const o = offsetRef.current;
      const res = await fetch(`/api/explore?offset=${o}&limit=20`);
      if (!res.ok) throw new Error(`explore ${res.status}`);
      const next = (await res.json()) as NowFeedItem[];
      if (next.length < 20) setHasMore(false);
      setItems((prev) => [...prev, ...next]);
      offsetRef.current = o + next.length;
    } catch (e) {
      console.error('Load more failed:', e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  return (
    <>
      {suggestions.length > 0 ? <SuggestionsRail profiles={suggestions} /> : null}

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
          onClick={loadMore}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-zinc-900 py-3 font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load more'}
        </button>
      ) : null}

      {items.length === 0 ? (
        <p className="py-16 text-center text-zinc-500">Nothing trending yet. Check back soon.</p>
      ) : null}
    </>
  );
}
