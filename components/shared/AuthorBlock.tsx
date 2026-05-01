'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { BadgeVerificationStatus } from '@/lib/ruehl/accountTypes';
import VerificationBadge from '@/components/profile/VerificationBadge';

export type AuthorBlockSize = 'sm' | 'md';

type Props = {
  username: string;
  avatarUrl?: string | null;
  badgeStatus: BadgeVerificationStatus;
  legacyIsVerified?: boolean | null;
  /** Timestamp, status, lifts count — never identity_text / tagline */
  meta: string;
  size?: AuthorBlockSize;
  /** Override profile link (default `/{username}`) */
  profileHref?: string;
  className?: string;
  /** e.g. Follow button — rendered after the linked author cluster */
  actions?: React.ReactNode;
};

const avatarPx: Record<AuthorBlockSize, string> = {
  sm: '40px',
  md: '48px',
};

const avatarBox: Record<AuthorBlockSize, string> = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
};

export default function AuthorBlock({
  username,
  avatarUrl,
  badgeStatus,
  legacyIsVerified,
  meta,
  size = 'md',
  profileHref,
  className = '',
  actions,
}: Props) {
  const un = String(username || 'user').replace(/^@+/, '');
  const href = profileHref ?? `/${encodeURIComponent(un)}`;
  const initial = un[0]?.toUpperCase() || '?';

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <Link
        href={href}
        className="flex min-w-0 flex-1 gap-3 rounded-lg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
      >
        <div
          className={`relative shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-1 ring-zinc-700 ${avatarBox[size]}`}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
              sizes={avatarPx[size]}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-400">
              {initial}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`truncate font-semibold text-white ${size === 'sm' ? 'text-sm' : 'text-base'}`}
            >
              @{un}
            </span>
            <VerificationBadge
              status={badgeStatus ?? null}
              legacyIsVerified={legacyIsVerified}
              size="sm"
            />
          </div>
          {meta ? <p className="mt-0.5 text-xs text-zinc-500">{meta}</p> : null}
        </div>
      </Link>
      {actions ? <div className="shrink-0 self-center">{actions}</div> : null}
    </div>
  );
}
