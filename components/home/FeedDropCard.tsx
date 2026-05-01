'use client';

import Link from 'next/link';
import AuthorBlock from '@/components/shared/AuthorBlock';
import { formatRelativeShort } from '@/lib/formatRelativeShort';
import type { NowFeedItem } from '@/lib/ruehl/queries/nowFeed';

type Props = { item: Extract<NowFeedItem, { type: 'drop' }> };

export default function FeedDropCard({ item }: Props) {
  const { drop, author } = item;
  const un = String(author?.username || 'user').replace(/^@+/, '');
  const dur =
    drop.duration_seconds != null && Number.isFinite(drop.duration_seconds)
      ? `${Math.round(Number(drop.duration_seconds))}s`
      : '—';
  const status = String(drop.status || '').trim();
  const when = drop.created_at ? formatRelativeShort(drop.created_at) : '';
  const meta = when ? `Dropped ${when}${status ? ` · ${status}` : ''}` : status || 'Drop';

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40 transition hover:border-zinc-700">
      <div className="px-4 pt-4 pb-3">
        <AuthorBlock
          username={un}
          avatarUrl={author?.avatar_url}
          badgeStatus={author?.badge_verification_status ?? null}
          legacyIsVerified={author?.is_verified}
          meta={meta}
          size="md"
        />
      </div>

      <Link href={`/drop/${drop.id}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
        <div className="border-t border-zinc-800/50 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-violet-400">
            <span aria-hidden>♪</span>
            <span>
              Drop · {dur}
            </span>
          </div>
        </div>

        {drop.caption ? (
          <div className="px-4 pb-3">
            <p className="line-clamp-2 text-zinc-200">{drop.caption}</p>
          </div>
        ) : null}
      </Link>
    </article>
  );
}
