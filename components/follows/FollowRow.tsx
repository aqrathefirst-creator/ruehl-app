'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AuthorBlock from '@/components/shared/AuthorBlock';
import {
  cancelFollowRequest,
  getFollowState,
  sendFollowRequest,
  unfollow,
  type FollowState,
} from '@/lib/api/relationships';
import { useUser } from '@/lib/useUser';
import type { FollowListItem } from '@/lib/ruehl/queries/follows';

type Props = { user: FollowListItem };

export default function FollowRow({ user }: Props) {
  const { user: viewer } = useUser();
  const viewerId = viewer?.id ?? null;
  const isOwnRow = Boolean(viewerId && viewerId === user.id);

  const [followState, setFollowState] = useState<FollowState>('not_following');
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!viewerId || isOwnRow || !user.id) {
      setFollowState(isOwnRow ? 'self' : 'not_following');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const s = await getFollowState(viewerId, user.id);
        if (!cancelled) setFollowState(s);
      } catch {
        if (!cancelled) setFollowState('not_following');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewerId, user.id, isOwnRow]);

  const onToggle = useCallback(async () => {
    if (!viewerId || isOwnRow || pendingRef.current) return;
    pendingRef.current = true;
    setBusy(true);
    const prev = followState;
    try {
      if (followState === 'following') {
        await unfollow(viewerId, user.id);
        setFollowState('not_following');
      } else if (followState === 'requested') {
        await cancelFollowRequest(user.id);
        setFollowState('not_following');
      } else {
        const result = await sendFollowRequest(user.id);
        const r = String(result || '').toLowerCase();
        if (r === 'followed' || r === 'already_following') setFollowState('following');
        else if (r === 'requested' || r === 'already_requested') setFollowState('requested');
        else setFollowState(await getFollowState(viewerId, user.id));
      }
    } catch {
      setFollowState(prev);
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }, [viewerId, isOwnRow, followState, user.id]);

  const label =
    followState === 'following' ? 'Following' : followState === 'requested' ? 'Requested' : 'Follow';

  const followBtn =
    !isOwnRow && viewerId ? (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          void onToggle();
        }}
        disabled={busy}
        className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:opacity-50 ${
          followState === 'following' || followState === 'requested'
            ? 'border border-zinc-600 bg-zinc-900 text-zinc-100 hover:border-violet-500/50 hover:bg-zinc-800'
            : 'bg-[#a855f7] text-white hover:bg-violet-500'
        }`}
      >
        {busy ? '…' : label}
      </button>
    ) : null;

  const meta =
    user.account_type != null ? String(user.account_type).replace(/_/g, ' ') : '';

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-1 transition hover:border-zinc-700">
      <AuthorBlock
        username={String(user.username || 'user').replace(/^@+/, '')}
        avatarUrl={user.avatar_url}
        badgeStatus={user.badge_verification_status ?? null}
        legacyIsVerified={user.is_verified}
        meta={meta}
        size="md"
        actions={followBtn ?? undefined}
      />
    </div>
  );
}
