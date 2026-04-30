import type { ProfileStatsRow } from '@/lib/ruehl/queries/profileServer';
import { formatCompact } from '@/lib/ruehl/formatNumber';

type Props = {
  stats: ProfileStatsRow;
};

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-[72px] flex-1 flex-col items-center rounded-lg py-2">
      <span className="text-lg font-bold tabular-nums text-white sm:text-xl">{formatCompact(value)}</span>
      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
    </div>
  );
}

export default function ProfileStats({ stats }: Props) {
  return (
    <section
      className="mx-auto grid max-w-2xl grid-cols-2 gap-2 border-y border-zinc-800/80 px-2 py-3 sm:grid-cols-5"
      aria-label="Profile stats"
    >
      <StatBlock value={stats.liftsReceived} label="Lifts" />
      <StatBlock value={stats.followers} label="Followers" />
      <StatBlock value={stats.following} label="Following" />
      <StatBlock value={stats.drops} label="Drops" />
      <StatBlock value={stats.tuneIns} label="Tune-ins" />
    </section>
  );
}
