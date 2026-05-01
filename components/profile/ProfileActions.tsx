'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import type { RuehlProfilePage } from '@/lib/ruehl/queries/profileServer';
import {
  cancelFollowRequest,
  getFollowState,
  sendFollowRequest,
  unfollow,
  checkIsTunedIn,
  toggleTuneIn,
  type FollowState,
} from '@/lib/api/relationships';

type Props = {
  profile: RuehlProfilePage;
};

export default function ProfileActions({ profile }: Props) {
  const { user, platformAdmin } = useUser();
  const viewerId = user?.id ?? null;
  const isOwn = Boolean(viewerId && viewerId === profile.id);

  const [followState, setFollowState] = useState<FollowState>('not_following');
  const [followBusy, setFollowBusy] = useState(false);
  const [tunedIn, setTunedIn] = useState(false);
  const [tuneBusy, setTuneBusy] = useState(false);
  const [blocked, setBlocked] = useState<'none' | 'i_blocked' | 'they_blocked'>('none');

  useEffect(() => {
    if (!viewerId || isOwn || !profile.id) {
      setFollowState(isOwn ? 'self' : 'not_following');
      setBlocked('none');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [state, b1, b2, tuned] = await Promise.all([
          getFollowState(viewerId, profile.id),
          supabase
            .from('blocked_users')
            .select('id')
            .eq('blocker_id', viewerId)
            .eq('blocked_id', profile.id)
            .maybeSingle(),
          supabase
            .from('blocked_users')
            .select('id')
            .eq('blocker_id', profile.id)
            .eq('blocked_id', viewerId)
            .maybeSingle(),
          checkIsTunedIn(viewerId, profile.id),
        ]);
        if (cancelled) return;
        if (b2.data) setBlocked('they_blocked');
        else if (b1.data) setBlocked('i_blocked');
        else setBlocked('none');
        setFollowState(state);
        setTunedIn(tuned);
      } catch {
        if (!cancelled) setFollowState('not_following');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewerId, profile.id, isOwn]);

  const onFollow = useCallback(async () => {
    if (!viewerId || isOwn || followBusy || blocked !== 'none') return;
    setFollowBusy(true);
    try {
      if (followState === 'following') {
        await unfollow(viewerId, profile.id);
        setFollowState('not_following');
      } else if (followState === 'requested') {
        await cancelFollowRequest(profile.id);
        setFollowState('not_following');
      } else {
        const result = await sendFollowRequest(profile.id);
        const r = String(result || '').toLowerCase();
        if (r === 'followed' || r === 'already_following') setFollowState('following');
        else if (r === 'requested' || r === 'already_requested') setFollowState('requested');
        else if (r === 'blocked') setBlocked('they_blocked');
        else setFollowState(await getFollowState(viewerId, profile.id));
      }
    } catch {
      /* toast later */
    } finally {
      setFollowBusy(false);
    }
  }, [viewerId, isOwn, followBusy, blocked, followState, profile.id]);

  const onTune = useCallback(async () => {
    if (!viewerId || isOwn || tuneBusy || blocked !== 'none') return;
    setTuneBusy(true);
    try {
      const res = await toggleTuneIn(viewerId, profile.id, tunedIn);
      if (res.success) setTunedIn(res.newState);
    } finally {
      setTuneBusy(false);
    }
  }, [viewerId, isOwn, tuneBusy, blocked, tunedIn, profile.id]);

  const btnBase =
    'inline-flex min-h-[40px] min-w-[100px] cursor-pointer items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-50';

  if (isOwn) {
    return (
      <div className="mx-auto flex max-w-2xl flex-wrap gap-2 px-4 py-4">
        <Link
          href="/edit-profile"
          className={`${btnBase} border border-zinc-600 bg-zinc-900 text-white hover:border-violet-500/50 hover:bg-zinc-800`}
        >
          Edit profile
        </Link>
        <Link
          href="/settings"
          className={`${btnBase} border border-zinc-700 bg-transparent text-zinc-200 hover:border-violet-500/40 hover:bg-white/5`}
        >
          Settings
        </Link>
        <Link
          href="/notifications"
          className={`${btnBase} border border-zinc-700 bg-transparent text-zinc-200 hover:border-violet-500/40 hover:bg-white/5`}
        >
          Notifications
        </Link>
        {platformAdmin && (
          <Link
            href="/admin"
            className={`${btnBase} border border-zinc-700 bg-transparent text-zinc-200 hover:border-violet-500/40 hover:bg-white/5`}
          >
            Admin
          </Link>
        )}
      </div>
    );
  }

  if (blocked === 'they_blocked' || blocked === 'i_blocked') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-4">
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-center text-sm text-zinc-400">
          {blocked === 'they_blocked' ? 'You can’t interact with this profile.' : 'You’ve blocked this account.'}
        </p>
      </div>
    );
  }

  if (!viewerId) {
    return (
      <div className="mx-auto flex max-w-2xl flex-wrap gap-2 px-4 py-4">
        <Link
          href="/login"
          className={`${btnBase} bg-[#a855f7] text-white hover:bg-violet-500`}
        >
          Sign in to follow
        </Link>
      </div>
    );
  }

  const followLabel =
    followState === 'following' ? 'Following' : followState === 'requested' ? 'Requested' : 'Follow';

  return (
    <div className="mx-auto flex max-w-2xl flex-wrap gap-2 px-4 py-4">
      <button
        type="button"
        onClick={() => void onFollow()}
        disabled={followBusy}
        className={`${btnBase} ${
          followState === 'not_following'
            ? 'bg-[#a855f7] text-white hover:bg-violet-500'
            : 'border border-zinc-600 bg-transparent text-white hover:border-violet-500/50 hover:bg-white/5'
        }`}
      >
        {followBusy ? '…' : followLabel}
      </button>
      <button
        type="button"
        onClick={() => void onTune()}
        disabled={tuneBusy}
        className={`${btnBase} border border-zinc-600 bg-zinc-900 text-white hover:border-violet-500/50 hover:bg-zinc-800`}
      >
        {tuneBusy ? '…' : tunedIn ? 'Tuned in' : 'Tune in'}
      </button>
    </div>
  );
}
