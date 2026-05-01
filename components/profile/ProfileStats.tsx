import Link from 'next/link';
import type { ProfileStatsRow, RuehlProfilePage } from '@/lib/ruehl/queries/profileServer';
import { formatCompact } from '@/lib/ruehl/formatNumber';

type Props = {
  profile: RuehlProfilePage;
  stats: ProfileStatsRow;
};

export default function ProfileStats({ profile, stats }: Props) {
  const un = String(profile.username || '').trim().replace(/^@+/, '');
  const base = un ? `/${encodeURIComponent(un)}` : '';

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 text-sm" aria-label="Profile stats">
      <span className="inline-flex items-baseline gap-1">
        <span className="font-bold tabular-nums text-white">{formatCompact(stats.posts)}</span>
        <span className="text-zinc-500">Posts</span>
      </span>
      {base ? (
        <Link href={`${base}/followers`} className="inline-flex items-baseline gap-1 transition hover:text-white">
          <span className="font-bold tabular-nums text-white">{formatCompact(stats.followers)}</span>
          <span className="text-zinc-500">Followers</span>
        </Link>
      ) : (
        <span className="inline-flex items-baseline gap-1">
          <span className="font-bold tabular-nums text-white">{formatCompact(stats.followers)}</span>
          <span className="text-zinc-500">Followers</span>
        </span>
      )}
      {base ? (
        <Link href={`${base}/following`} className="inline-flex items-baseline gap-1 transition hover:text-white">
          <span className="font-bold tabular-nums text-white">{formatCompact(stats.following)}</span>
          <span className="text-zinc-500">Following</span>
        </Link>
      ) : (
        <span className="inline-flex items-baseline gap-1">
          <span className="font-bold tabular-nums text-white">{formatCompact(stats.following)}</span>
          <span className="text-zinc-500">Following</span>
        </span>
      )}
    </div>
  );
}
