import Link from 'next/link';
import type { ProfileStatsRow } from '@/lib/ruehl/queries/profileServer';
import { formatCompact } from '@/lib/ruehl/formatNumber';

type Props = {
  stats: ProfileStatsRow;
  /** Profile username for follow list links (no leading @). */
  username: string | null;
};

export default function ProfileStats({ stats, username }: Props) {
  const un = String(username || '').trim().replace(/^@+/, '');
  const base = un ? `/${encodeURIComponent(un)}` : '';

  return (
    <section
      className="mx-auto flex max-w-2xl items-center gap-6 border-b border-zinc-800/50 px-4 py-3 sm:gap-10"
      aria-label="Profile stats"
    >
      <div className="min-w-0 flex-1 text-center">
        <div className="text-lg font-bold tabular-nums text-white sm:text-xl">{formatCompact(stats.posts)}</div>
        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Posts</div>
      </div>

      {base ? (
        <Link
          href={`${base}/followers`}
          className="min-w-0 flex-1 text-center transition hover:bg-white/5 sm:rounded-lg sm:py-1"
        >
          <div className="text-lg font-bold tabular-nums text-white sm:text-xl">{formatCompact(stats.followers)}</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Followers</div>
        </Link>
      ) : (
        <div className="min-w-0 flex-1 text-center">
          <div className="text-lg font-bold tabular-nums text-white sm:text-xl">{formatCompact(stats.followers)}</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Followers</div>
        </div>
      )}

      {base ? (
        <Link
          href={`${base}/following`}
          className="min-w-0 flex-1 text-center transition hover:bg-white/5 sm:rounded-lg sm:py-1"
        >
          <div className="text-lg font-bold tabular-nums text-white sm:text-xl">{formatCompact(stats.following)}</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Following</div>
        </Link>
      ) : (
        <div className="min-w-0 flex-1 text-center">
          <div className="text-lg font-bold tabular-nums text-white sm:text-xl">{formatCompact(stats.following)}</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Following</div>
        </div>
      )}
    </section>
  );
}
