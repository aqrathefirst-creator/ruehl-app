'use client';

import FeedList from '@/components/feed/FeedList';

/**
 * Home feed (WEB_DIRECTION §2 / §4) — main column max 600px; right rail `Now Trending` + `Suggested for you` from {@link RightRail} (home variant).
 * Post detail and Echo recording: later phases; media tap logs in dev (see FeedCard).
 */
export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-[600px] px-4 pb-24 pt-4 md:pt-6">
      <h1 className="sr-only">Home</h1>
      <FeedList />
    </div>
  );
}
