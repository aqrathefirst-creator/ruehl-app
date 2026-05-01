'use client';

import { useEffect, useRef, useState } from 'react';
import FeedPostCard from '@/components/home/FeedPostCard';
import FeedDropCard from '@/components/home/FeedDropCard';
import type { NowFeedItem } from '@/lib/ruehl/queries/nowFeed';

type SubTab = 'now' | 'drops';

export default function NowSurface({ userId }: { userId: string }) {
  const [tab, setTab] = useState<SubTab>('now');
  const [items, setItems] = useState<NowFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchSeq = useRef(0);

  useEffect(() => {
    const seq = ++fetchSeq.current;
    setLoading(true);

    void (async () => {
      try {
        const res = await fetch(`/api/now-surface?tab=${encodeURIComponent(tab)}`, {
          credentials: 'same-origin',
        });
        if (seq !== fetchSeq.current) return;
        if (!res.ok) {
          setItems([]);
          return;
        }
        const data = (await res.json()) as NowFeedItem[];
        setItems(Array.isArray(data) ? data : []);
      } catch {
        if (seq === fetchSeq.current) setItems([]);
      } finally {
        if (seq === fetchSeq.current) setLoading(false);
      }
    })();
  }, [tab, userId]);

  return (
    <>
      <div className="mb-6 flex gap-6 border-b border-zinc-800">
        <button
          type="button"
          onClick={() => setTab('now')}
          className={`px-1 pb-3 text-sm font-semibold uppercase tracking-wide transition ${
            tab === 'now'
              ? 'border-b-2 border-[#a855f7] text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Now
        </button>
        <button
          type="button"
          onClick={() => setTab('drops')}
          className={`px-1 pb-3 text-sm font-semibold uppercase tracking-wide transition ${
            tab === 'drops'
              ? 'border-b-2 border-[#a855f7] text-white'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Drops
        </button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-zinc-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-zinc-500">
          {tab === 'now' ? 'No recent activity from people you follow.' : 'No drops from people you follow.'}
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              {item.type === 'post' ? <FeedPostCard item={item} /> : <FeedDropCard item={item} />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
