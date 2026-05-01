'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Drop } from '@/lib/ruehl/drops';
import type { RuehlProfile } from '@/lib/ruehl/types';
import VerificationBadge from '@/components/profile/VerificationBadge';

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function displayLine(author: RuehlProfile | null): string {
  const id = String(author?.identity_text || '').trim();
  if (id) return id.split('\n')[0]!.trim();
  return String(author?.username || 'Creator').replace(/^@+/, '');
}

type Props = {
  drop: Drop;
  author: RuehlProfile | null;
};

export default function DropAuthor({ drop, author }: Props) {
  const un = String(author?.username || 'creator').replace(/^@+/, '');
  const href = `/${encodeURIComponent(un)}`;

  return (
    <header className="flex gap-3 border-b border-zinc-800/90 pb-4">
      <Link
        href={href}
        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-1 ring-zinc-700 transition-opacity hover:opacity-90"
      >
        {author?.avatar_url ? (
          <Image src={author.avatar_url} alt="" fill className="object-cover" unoptimized sizes="48px" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-400">
            {un[0]?.toUpperCase() || '?'}
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={href} className="truncate font-semibold text-white hover:text-violet-200">
            {displayLine(author)}
          </Link>
          <VerificationBadge
            status={author?.badge_verification_status ?? null}
            legacyIsVerified={author?.is_verified}
            size="sm"
          />
        </div>
        <Link href={href} className="text-sm text-violet-300/90 hover:underline">
          @{un}
        </Link>
        <p className="mt-1 text-xs text-zinc-500">
          Dropped {formatRelative(drop.scheduledFor)} · {drop.status}
        </p>
      </div>
    </header>
  );
}
