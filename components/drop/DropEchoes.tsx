'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { resolveEchoAudioUrl } from '@/components/drop/dropAudioUrl';
import type { DropEchoListItem } from '@/lib/ruehl/queries/drop';
import VerificationBadge from '@/components/profile/VerificationBadge';

type Props = {
  echoes: DropEchoListItem[];
};

function EchoRow({ echo }: { echo: DropEchoListItem }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const url = await resolveEchoAudioUrl(echo.audioPath, echo.audioVisibility);
      if (!cancelled) setSrc(url || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [echo.id, echo.audioPath, echo.audioVisibility]);

  const author = echo.author;
  const un = String(author?.username || 'user').replace(/^@+/, '');
  const href = `/${encodeURIComponent(un)}`;

  return (
    <li className="border-b border-zinc-900 py-4 last:border-0">
      <div className="flex gap-3">
        <Link href={href} className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-1 ring-zinc-700">
          {author?.avatar_url ? (
            <Image src={author.avatar_url} alt="" fill className="object-cover" unoptimized sizes="40px" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-400">
              {un[0]?.toUpperCase() || '?'}
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={href} className="truncate text-sm font-semibold text-zinc-100 hover:underline">
              @{un}
            </Link>
            <VerificationBadge
              status={author?.badge_verification_status ?? null}
              legacyIsVerified={author?.is_verified}
              size={14}
            />
          </div>
          {echo.durationSeconds > 0 ? (
            <p className="mt-0.5 text-xs text-zinc-500">{Math.round(echo.durationSeconds)}s clip</p>
          ) : null}
          {src ? (
            <audio src={src} controls className="mt-2 w-full" preload="metadata" />
          ) : (
            <p className="mt-2 text-xs text-zinc-500">
              {echo.audioVisibility === 'private' ? 'Sign in to play echo.' : 'Audio unavailable.'}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export default function DropEchoes({ echoes }: Props) {
  return (
    <section id="drop-echoes" className="mt-8 border-t border-zinc-800 pt-6">
      <h2 className="mb-4 text-lg font-semibold text-zinc-100">Echoes</h2>
      {echoes.length === 0 ? (
        <p className="text-sm text-zinc-500">No echoes yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-900">
          {echoes.map((e) => (
            <EchoRow key={e.id} echo={e} />
          ))}
        </ul>
      )}
    </section>
  );
}
