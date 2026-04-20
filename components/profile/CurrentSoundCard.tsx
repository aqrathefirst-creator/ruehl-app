'use client';

import Image from 'next/image';
import type { CurrentSoundDisplay } from '@/lib/ruehl/queries/profile';

type Props = {
  sound: CurrentSoundDisplay;
};

export default function CurrentSoundCard({ sound }: Props) {
  const title = sound.trackName || 'Track';
  const artist = sound.artistName || 'Artist';
  const spotifyId = sound.spotifyTrackId;
  const href = spotifyId ? `https://open.spotify.com/track/${spotifyId}` : null;

  if (!spotifyId && !sound.previewUrl) {
    return null;
  }

  return (
    <div
      className="flex h-[88px] max-w-full items-center gap-3 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-2"
      data-testid="current-sound-card"
    >
      <div
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-media)] bg-[var(--bg-tertiary)]"
        style={{ aspectRatio: '1' }}
      >
        {sound.coverUrl ? (
          <Image src={sound.coverUrl} alt="" fill className="object-cover" unoptimized sizes="56px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--text-muted)]">
            ♪
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="truncate text-[12px] text-[var(--text-muted)]">{artist}</p>
      </div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--accent-spotify)] px-3 py-1.5 text-[12px] font-bold text-black"
        >
          Open
        </a>
      ) : null}
    </div>
  );
}
