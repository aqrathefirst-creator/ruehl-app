'use client';

import Image from 'next/image';
import type { RuehlPost } from '@/lib/ruehl/types';
import type { ProfileTab } from '@/lib/ruehl/queries/profile';
import { isPowrPost } from '@/lib/ruehl/posts';

type Props = {
  tab: ProfileTab;
  posts: RuehlPost[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
};

function thumbUrl(p: RuehlPost): string | null {
  const m = p.media_url;
  if (m && String(m).trim()) return String(m);
  const urls = p.media_urls;
  if (Array.isArray(urls) && urls[0]) return String(urls[0]);
  return null;
}

const EMPTY: Record<ProfileTab, string> = {
  posts: 'No posts yet',
  powr: 'No POWR thoughts yet',
  likes: 'Nothing liked yet',
  lifted: 'Nothing lifted yet',
};

export default function ProfileTabContent({ tab, posts, loading, hasMore, onLoadMore }: Props) {
  if (loading && posts.length === 0) {
    return (
      <div className="mt-4 grid grid-cols-3 gap-1 md:gap-1.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square w-full rounded-[var(--radius-media)] bg-[var(--bg-elevated)]"
          />
        ))}
      </div>
    );
  }

  if (!loading && posts.length === 0) {
    return (
      <p className="py-16 text-center text-[14px] text-[var(--text-muted)]">{EMPTY[tab]}</p>
    );
  }

  if (tab === 'powr') {
    return (
      <div className="mt-4 flex flex-col gap-3">
        {posts.map((p) => (
          <article
            key={p.id}
            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3"
          >
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--text-primary)]">
              {String(p.content || '').trim() || '—'}
            </p>
          </article>
        ))}
        {hasMore ? (
          <button
            type="button"
            onClick={onLoadMore}
            className="mx-auto mt-2 rounded-[var(--radius-pill)] border border-[var(--border-medium)] px-5 py-2 text-[13px] font-semibold text-[var(--text-secondary)]"
          >
            Load more
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-3 gap-1 md:gap-1.5">
      {posts.map((p) => {
        const url = thumbUrl(p);
        return (
          <div
            key={p.id}
            className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-media)] bg-[var(--bg-tertiary)]"
          >
            {url ? (
              <Image src={url} alt="" fill className="object-cover" unoptimized sizes="120px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-2 text-center text-[11px] text-[var(--text-muted)]">
                {isPowrPost(p) ? String(p.content || '').slice(0, 80) : '…'}
              </div>
            )}
          </div>
        );
      })}
      {hasMore ? (
        <div className="col-span-3 flex justify-center py-4">
          <button
            type="button"
            onClick={onLoadMore}
            className="rounded-[var(--radius-pill)] border border-[var(--border-medium)] px-5 py-2 text-[13px] font-semibold text-[var(--text-secondary)]"
          >
            Load more
          </button>
        </div>
      ) : null}
    </div>
  );
}
