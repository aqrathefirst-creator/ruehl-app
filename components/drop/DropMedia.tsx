'use client';

import { useEffect, useState } from 'react';
import { resolveDropMainAudioUrl } from '@/components/drop/dropAudioUrl';

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

type Props = {
  audioPath: string;
  audioVisibility: 'public' | 'private';
  durationSeconds: number;
  embedded?: boolean;
};

export default function DropMedia({ audioPath, audioVisibility, durationSeconds, embedded }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const url = await resolveDropMainAudioUrl(audioPath, audioVisibility);
      if (!cancelled) setSrc(url || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [audioPath, audioVisibility]);

  const hint = formatDuration(durationSeconds);

  if (!audioPath.trim()) {
    return null;
  }

  if (embedded) {
    return (
      <div className="space-y-2">
        {hint ? <p className="text-xs tabular-nums text-zinc-500">{hint}</p> : null}
        {src ? (
          <audio src={src} controls className="w-full" preload="metadata" />
        ) : (
          <p className="text-sm text-zinc-500">
            {audioVisibility === 'private' ? 'Sign in to play this drop.' : 'Audio unavailable.'}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 ring-1 ring-zinc-800/80">
      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400/80">Drop audio</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      {src ? (
        <audio src={src} controls className="mt-3 w-full" preload="metadata" />
      ) : (
        <p className="mt-3 text-sm text-zinc-500">
          {audioVisibility === 'private' ? 'Sign in to play this drop.' : 'Audio unavailable.'}
        </p>
      )}
    </div>
  );
}
