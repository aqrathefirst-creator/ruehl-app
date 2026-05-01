import Link from 'next/link';
import type { ProfileStatsRow } from '@/lib/ruehl/queries/profileServer';
import { formatCompact } from '@/lib/ruehl/formatNumber';

type Props = {
  stats: ProfileStatsRow;
  /** Profile username for follow list links (no leading @). */
  username: string | null;
};

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-[72px] flex-1 flex-col items-center rounded-lg py-2">
      <span className="text-lg font-bold tabular-nums text-white sm:text-xl">{formatCompact(value)}</span>
      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
    </div>
  );
}

export default function ProfileStats({ stats, username }: Props) {
  const un = String(username || '').trim().replace(/^@+/, '');
  const base = un ? `/${encodeURIComponent(un)}` : '';

  return (
    <section
      className="mx-auto grid max-w-2xl grid-cols-2 gap-2 border-y border-zinc-800/80 px-2 py-3 sm:grid-cols-5"
      aria-label="Profile stats"
    >
      <StatBlock value={stats.liftsReceived} label="Lifts" />
      {base ? (
        <Link
          href={`${base}/followers`}
          className="flex min-w-[72px] flex-1 flex-col items-center rounded-lg py-2 transition hover:bg-white/5"
        >
          <span className="text-lg font-bold tabular-nums text-white sm:text-xl">{formatCompact(stats.followers)}</span>
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Followers</span>
        </Link>
      ) : (
        <StatBlock value={stats.followers} label="Followers" />
      )}
      {base ? (
        <Link
          href={`${base}/following`}
          className="flex min-w-[72px] flex-1 flex-col items-center rounded-lg py-2 transition hover:bg-white/5"
        >
          <span className="text-lg font-bold tabular-nums text-white sm:text-xl">{formatCompact(stats.following)}</span>
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Following</span>
        </Link>
      ) : (
        <StatBlock value={stats.following} label="Following" />
      )}
      <StatBlock value={stats.drops} label="Drops" />
      <StatBlock value={stats.tuneIns} label="Tune-ins" />
    </section>
  );
}
