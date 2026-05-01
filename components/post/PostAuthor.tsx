'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AuthorBlock from '@/components/shared/AuthorBlock';
import { formatRelativeShort } from '@/lib/formatRelativeShort';
import { useUser } from '@/lib/useUser';
import type { RuehlProfile } from '@/lib/ruehl/types';
import type { PostDetailPost } from '@/lib/ruehl/queries/post';
import {
  cancelFollowRequest,
  getFollowState,
  sendFollowRequest,
  unfollow,
  type FollowState,
} from '@/lib/api/relationships';

type Props = {
  post: PostDetailPost;
  author: RuehlProfile | null;
};

export default function PostAuthor({ post, author }: Props) {
  const { user } = useUser();
  const viewerId = user?.id ?? null;
  const isOwn = Boolean(viewerId && viewerId === post.user_id);
  const un = String(author?.username || 'user').replace(/^@+/, '');

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

  const followBtn =
    !isOwn && viewerId ? (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          void onFollow();
        }}
        disabled={followBusy}
        className={`h-9 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:opacity-50 ${
          followState === 'not_following'
            ? 'bg-[#a855f7] text-white hover:bg-violet-500'
            : 'border border-zinc-600 bg-zinc-900 text-zinc-100 hover:border-violet-500/50 hover:bg-zinc-800'
        }`}
      >
        {followBusy ? '…' : followLabel}
      </button>
    ) : !viewerId ? (
      <Link
        href="/login"
        className="h-9 rounded-full bg-[#a855f7] px-4 text-sm font-semibold leading-9 text-white hover:bg-violet-500"
        onClick={(e) => e.stopPropagation()}
      >
        Follow
      </Link>
    ) : null;

  return (
    <header className="mt-4 border-b border-zinc-800/90 pb-4">
      <AuthorBlock
        username={un}
        avatarUrl={author?.avatar_url}
        badgeStatus={author?.badge_verification_status ?? null}
        legacyIsVerified={author?.is_verified}
        meta={formatRelativeShort(post.created_at)}
        size="md"
        actions={followBtn}
      />
    </header>
  );
}
