'use client';

import Link from 'next/link';
import { resolvePostSound } from '@/lib/ruehl/posts';
import type { PostDetailPost } from '@/lib/ruehl/queries/post';

type Props = { post: PostDetailPost; embedded?: boolean };

export default function PostMusic({ post, embedded }: Props) {
  const sound = resolvePostSound(post);
  if (!sound) return null;

  const title = sound.trackName || 'Track';
  const artist = sound.artistName || 'Artist';

  return (
    <div
      className={
        embedded
          ? 'rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3'
          : 'mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3'
      }
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400/80">Sound</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{title}</p>
          <p className="truncate text-sm text-zinc-500">{artist}</p>
        </div>
        <Link
          href={`/sound/${encodeURIComponent(sound.id)}`}
          className="shrink-0 rounded-full border border-violet-500/40 bg-violet-950/40 px-3 py-1.5 text-xs font-semibold text-violet-200 transition-colors hover:border-violet-400 hover:bg-violet-900/50"
        >
          Open
        </Link>
      </div>
    </div>
  );
}
