'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback } from 'react';
import type { LoadedComment } from './PostComments';

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type Props = {
  comment: LoadedComment;
};

export default function CommentCard({ comment }: Props) {
  const onReport = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.alert('Reporting is available in the Ruehl app.');
    }
  }, []);

  const profileHref = comment.username ? `/${comment.username}` : null;

  const avatarBlock = comment.avatar_url ? (
    <Image
      src={comment.avatar_url}
      alt=""
      width={40}
      height={40}
      className="h-10 w-10 rounded-full object-cover"
      unoptimized
    />
  ) : (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-zinc-400">
      {(comment.username ?? '?').slice(0, 1).toUpperCase()}
    </div>
  );

  return (
    <li className="flex gap-3 border-b border-zinc-900 py-4 last:border-0">
      {profileHref ? (
        <Link href={profileHref} className="shrink-0">
          {avatarBlock}
        </Link>
      ) : (
        <div className="shrink-0">{avatarBlock}</div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {profileHref ? (
            <Link href={profileHref} className="truncate text-sm font-semibold text-zinc-100 hover:underline">
              {comment.username ?? 'Unknown'}
            </Link>
          ) : (
            <span className="truncate text-sm font-semibold text-zinc-100">{comment.username ?? 'Unknown'}</span>
          )}
          <span className="text-xs text-zinc-500">{formatRelativeTime(comment.created_at)}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-300">{comment.content}</p>
      </div>
      <div className="shrink-0 self-start">
        <button
          type="button"
          onClick={onReport}
          className="rounded p-1.5 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-300"
          title="Report"
          aria-label="Report comment"
        >
          ⋮
        </button>
      </div>
    </li>
  );
}
