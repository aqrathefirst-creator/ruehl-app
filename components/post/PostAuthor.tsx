'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import type { RuehlProfile } from '@/lib/ruehl/types';
import type { PostDetailPost } from '@/lib/ruehl/queries/post';
import VerificationBadge from '@/components/profile/VerificationBadge';
import {
  cancelFollowRequest,
  getFollowState,
  sendFollowRequest,
  unfollow,
  type FollowState,
} from '@/lib/api/relationships';

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
  return String(author?.username || 'User').replace(/^@+/, '');
}

type Props = {
  post: PostDetailPost;
  author: RuehlProfile | null;
};

export default function PostAuthor({ post, author }: Props) {
  const { user } = useUser();
  const viewerId = user?.id ?? null;
  const isOwn = Boolean(viewerId && viewerId === post.user_id);
  const un = String(author?.username || 'user').replace(/^@+/, '');
  const href = `/${encodeURIComponent(un)}`;

  const [followState, setFollowState] = useState<FollowState>('not_following');
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    if (!viewerId || isOwn || !post.user_id) {
      setFollowState(isOwn ? 'self' : 'not_following');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const s = await getFollowState(viewerId, post.user_id);
        if (!cancelled) setFollowState(s);
      } catch {
        if (!cancelled) setFollowState('not_following');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewerId, post.user_id, isOwn]);

  const onFollow = useCallback(async () => {
    if (!viewerId || isOwn || followBusy) return;
    setFollowBusy(true);
    try {
      if (followState === 'following') {
        await unfollow(viewerId, post.user_id);
        setFollowState('not_following');
      } else if (followState === 'requested') {
        await cancelFollowRequest(post.user_id);
        setFollowState('not_following');
      } else {
        const result = await sendFollowRequest(post.user_id);
        const r = String(result || '').toLowerCase();
        if (r === 'followed' || r === 'already_following') setFollowState('following');
        else if (r === 'requested' || r === 'already_requested') setFollowState('requested');
        else setFollowState(await getFollowState(viewerId, post.user_id));
      }
    } finally {
      setFollowBusy(false);
    }
  }, [viewerId, isOwn, followBusy, followState, post.user_id]);

  const followLabel =
    followState === 'following' ? 'Following' : followState === 'requested' ? 'Requested' : 'Follow';

  return (
    <header className="mt-4 flex gap-3 border-b border-zinc-800/90 pb-4">
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
        <p className="mt-1 text-xs text-zinc-500">{formatRelative(post.created_at)}</p>
      </div>
      {!isOwn && viewerId ? (
        <button
          type="button"
          onClick={() => void onFollow()}
          disabled={followBusy}
          className={`h-9 shrink-0 self-center rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:opacity-50 ${
            followState === 'not_following'
              ? 'bg-[#a855f7] text-white hover:bg-violet-500'
              : 'border border-zinc-600 bg-zinc-900 text-zinc-100 hover:border-violet-500/50 hover:bg-zinc-800'
          }`}
        >
          {followBusy ? '…' : followLabel}
        </button>
      ) : null}
      {!viewerId ? (
        <Link
          href="/login"
          className="h-9 shrink-0 self-center rounded-full bg-[#a855f7] px-4 text-sm font-semibold leading-9 text-white hover:bg-violet-500"
        >
          Follow
        </Link>
      ) : null}
    </header>
  );
}
