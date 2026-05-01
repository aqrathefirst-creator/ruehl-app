'use client';

import { useMemo, useState } from 'react';
import SoundHeader from '@/components/sound/SoundHeader';
import SoundPostList from '@/components/sound/SoundPostList';
import type { SoundDetailPageData } from '@/lib/ruehl/queries/sound';

type Props = {
  initial: SoundDetailPageData;
};

type Tab = 'trending' | 'recent';

/** Native `SoundPageScreen` defaults to trending first. */
export default function SoundDetailView({ initial }: Props) {
  const { sound, posts } = initial;
  const [tab, setTab] = useState<Tab>('trending');

  const postCountLabel =
    sound.usageCount != null && sound.usageCount > 0 ? sound.usageCount : posts.length;

  const sortedPosts = useMemo(() => {
    const copy = [...posts];
    if (tab === 'recent') {
      copy.sort((a, b) => {
        const tb = new Date(b.created_at || 0).getTime();
        const ta = new Date(a.created_at || 0).getTime();
        return tb - ta;
      });
      return copy;
    }
    // Trending (v1): lifts primary, recency tiebreak — native uses richer momentum; this approximates.
    copy.sort((a, b) => {
      const liftDiff = (b.liftCount ?? 0) - (a.liftCount ?? 0);
      if (liftDiff !== 0) return liftDiff;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
    return copy;
  }, [posts, tab]);

  return (
    <article>
      <SoundHeader sound={sound} postCountLabel={postCountLabel} />

      <div className="mt-6">
        <div className="mb-4 flex gap-6 border-b border-zinc-800">
          <button
            type="button"
            onClick={() => setTab('trending')}
            className={`pb-2 px-1 text-sm font-medium transition ${
              tab === 'trending'
                ? 'border-b-2 border-[#a855f7] text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Trending
          </button>
          <button
            type="button"
            onClick={() => setTab('recent')}
            className={`pb-2 px-1 text-sm font-medium transition ${
              tab === 'recent'
                ? 'border-b-2 border-[#a855f7] text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Recent
          </button>
        </div>

        <SoundPostList posts={sortedPosts} />
      </div>
    </article>
  );
}
