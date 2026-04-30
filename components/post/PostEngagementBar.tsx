'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Share2, Sparkles } from 'lucide-react';
import { isPostLiftedByCurrentUser, togglePostLift } from '@/lib/api/lifts';

type Props = {
  postId: string;
  liftCount: number;
  onLiftCountChange: Dispatch<SetStateAction<number>>;
  commentCount: number;
  hideShare?: boolean;
};

export default function PostEngagementBar({
  postId,
  liftCount,
  onLiftCountChange,
  commentCount,
  hideShare,
}: Props) {
  const [lifted, setLifted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const v = await isPostLiftedByCurrentUser(postId);
      if (!cancelled) setLifted(v);
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const onLift = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { lifted: next } = await togglePostLift(postId);
      setLifted(next);
      onLiftCountChange((c) => Math.max(0, c + (next ? 1 : -1)));
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Could not update lift');
      setTimeout(() => setToast(null), 2500);
    } finally {
      setBusy(false);
    }
  }, [busy, postId, onLiftCountChange]);

  const scrollComments = () => {
    document.getElementById('post-comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onShare = async () => {
    const url =
      typeof window !== 'undefined' ? `${window.location.origin}/post/${encodeURIComponent(postId)}` : '';
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Ruehl post', url });
      } else {
        await navigator.clipboard.writeText(url);
        setToast('Link copied');
        setTimeout(() => setToast(null), 2000);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setToast('Link copied');
        setTimeout(() => setToast(null), 2000);
      } catch {
        setToast('Could not share');
        setTimeout(() => setToast(null), 2000);
      }
    }
  };

  return (
    <div className="relative mt-6 flex items-center justify-around border-y border-zinc-800 py-3">
      {toast ? (
        <p className="absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-200">
          {toast}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void onLift()}
        disabled={busy}
        className={`flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:opacity-50 ${
          lifted ? 'text-violet-300' : 'text-zinc-300 hover:bg-white/5 hover:text-violet-200'
        }`}
      >
        <Sparkles className={`h-5 w-5 ${lifted ? 'fill-violet-400 text-violet-400' : ''}`} strokeWidth={2} />
        <span className="font-semibold tabular-nums">{liftCount}</span>
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">Lift</span>
      </button>
      <button
        type="button"
        onClick={scrollComments}
        className="flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
      >
        <MessageCircle className="h-5 w-5" strokeWidth={2} />
        <span className="font-semibold tabular-nums">{commentCount}</span>
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">Comments</span>
      </button>
      {!hideShare ? (
        <button
          type="button"
          onClick={() => void onShare()}
          className="flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          <Share2 className="h-5 w-5" strokeWidth={2} />
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">Share</span>
        </button>
      ) : null}
    </div>
  );
}
