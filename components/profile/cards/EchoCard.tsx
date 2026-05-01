'use client';

import AuthorBlock from '@/components/shared/AuthorBlock';
import type { BadgeVerificationStatus } from '@/lib/ruehl/accountTypes';
import type { ProfileDropEchoRow } from '@/lib/ruehl/queries/profileTabs';
import AppViewCta from '@/components/profile/cards/AppViewCta';

type Props = {
  echo: ProfileDropEchoRow;
  profileUsername: string | null;
  profileAvatarUrl?: string | null;
  profileBadgeStatus: BadgeVerificationStatus;
  profileIsVerified: boolean | null;
};

export default function EchoCard({
  echo,
  profileUsername,
  profileAvatarUrl,
  profileBadgeStatus,
  profileIsVerified,
}: Props) {
  const dur = echo.duration_seconds != null ? `${echo.duration_seconds}s` : '—';
  const when = echo.created_at ? new Date(echo.created_at).toLocaleDateString() : '';
  const un = String(profileUsername || 'user').replace(/^@+/, '');
  const meta = `${dur} · ${when}`;

  return (
    <article className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
      <AuthorBlock
        username={un}
        avatarUrl={profileAvatarUrl}
        badgeStatus={profileBadgeStatus}
        legacyIsVerified={profileIsVerified}
        meta={meta}
        size="sm"
        className="mb-3"
      />
      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400/80">Echo</p>
      <p className="mt-1 text-[13px] text-zinc-300">
        On drop{' '}
        <span className="font-mono text-[11px] text-zinc-500">
          {echo.drop_id.length > 10 ? `${echo.drop_id.slice(0, 8)}…` : echo.drop_id}
        </span>
      </p>
      <AppViewCta />
    </article>
  );
}
