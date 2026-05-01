'use client';

import Link from 'next/link';
import AuthorBlock from '@/components/shared/AuthorBlock';
import type { BadgeVerificationStatus } from '@/lib/ruehl/accountTypes';
import type { ProfileDropRow } from '@/lib/ruehl/queries/profileTabs';

type Props = {
  drop: ProfileDropRow;
  profileUsername: string | null;
  profileAvatarUrl?: string | null;
  profileBadgeStatus: BadgeVerificationStatus;
  profileIsVerified: boolean | null;
};

export default function DropCard({
  drop,
  profileUsername,
  profileAvatarUrl,
  profileBadgeStatus,
  profileIsVerified,
}: Props) {
  const cap = String(drop.caption || '').trim() || 'Voice drop';
  const st = String(drop.status || '—');
  const un = String(profileUsername || 'user').replace(/^@+/, '');
  const meta = drop.scheduled_for
    ? `${st} · ${new Date(drop.scheduled_for).toLocaleString()}`
    : st;

  return (
    <article className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 transition hover:border-zinc-700 hover:bg-zinc-900/40">
      <AuthorBlock
        username={un}
        avatarUrl={profileAvatarUrl}
        badgeStatus={profileBadgeStatus}
        legacyIsVerified={profileIsVerified}
        meta={meta}
        size="sm"
        className="mb-3"
      />
      <Link
        href={`/drop/${drop.id}`}
        className="block rounded-lg outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400/80">Drop</p>
        <p className="mt-1 line-clamp-3 text-[14px] font-medium text-white">{cap}</p>
      </Link>
    </article>
  );
}
