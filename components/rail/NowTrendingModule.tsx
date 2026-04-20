'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getTrendingSounds, type TrendingSound } from '@/lib/ruehl/queries/feed';

export default function NowTrendingModule() {
  const [items, setItems] = useState<TrendingSound[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getTrendingSounds(5).then((rows) => {
      if (!cancelled) setItems(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null) {
    return (
      <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Now Trending</h3>
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((k) => (
            <div key={k} className="flex animate-pulse gap-3">
              <div className="h-12 w-12 shrink-0 rounded-md bg-[var(--bg-primary)]" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-[85%] rounded bg-[var(--bg-primary)]" />
                <div className="h-3 w-[55%] rounded bg-[var(--bg-primary)]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Now Trending</h3>
      <ul className="space-y-2">
        {items.map((t) => (
          <li key={t.id + t.trackName}>
            <Link
              href={`/sound/${encodeURIComponent(t.id)}`}
              className="flex gap-3 rounded-lg p-1.5 transition hover:bg-[var(--bg-primary)]"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[var(--bg-primary)]">
                {t.coverUrl ? (
                  <Image src={t.coverUrl} alt="" fill className="object-cover" unoptimized sizes="48px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-[var(--text-muted)]">♪</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">{t.trackName}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">{t.artistName || '—'}</p>
                {t.usageCount > 0 && <p className="text-[10px] text-[var(--text-muted)]">{t.usageCount} posts</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
