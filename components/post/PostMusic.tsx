'use client';

import Link from 'next/link';
import { resolvePostSound } from '@/lib/ruehl/posts';
import type { PostDetailPost } from '@/lib/ruehl/queries/post';

type Props = { post: PostDetailPost; embedded?: boolean };

/** Prefer canonical `sound_id` for `/sound/[id]` when the row has it; else licensed / user_sound id (resolved by sound query). */
function soundPageRouteKey(post: PostDetailPost, resolvedId: string): string {
  const sid = String(post.sound_id || '').trim();
  return sid || resolvedId;
}

export default function PostMusic({ post, embedded }: Props) {
  const sound = resolvePostSound(post);
  if (!sound) return null;

  const title = sound.trackName || 'Track';
  const artist = sound.artistName || 'Artist';
  const href = `/sound/${encodeURIComponent(soundPageRouteKey(post, sound.id))}`;

  return (
    <Link
      href={href}
      className={`block transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
        embedded
          ? 'rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3'
          : 'mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3'
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400/80">Sound</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-white">{title}</p>
          <p className="truncate text-sm text-zinc-500">{artist}</p>
        </div>
        <span className="shrink-0 rounded-full border border-violet-500/40 bg-violet-950/40 px-3 py-1.5 text-xs font-semibold text-violet-200">
          View
        </span>
      </div>
    </Link>
  );
}
