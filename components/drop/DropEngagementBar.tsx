'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Share2, Sparkles } from 'lucide-react';
import { isDropLiftedByCurrentUser, toggleDropLift } from '@/lib/api/dropLifts';

type Props = {
  dropId: string;
  liftCount: number;
  onLiftCountChange: Dispatch<SetStateAction<number>>;
  echoCount: number;
  embedded?: boolean;
};

export default function DropEngagementBar({
  dropId,
  liftCount,
  onLiftCountChange,
  echoCount,
  embedded,
}: Props) {
  const [lifted, setLifted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const liftedRef = useRef(false);

  useEffect(() => {
    liftedRef.current = lifted;
  }, [lifted]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const v = await isDropLiftedByCurrentUser(dropId);
      if (!cancelled) setLifted(v);
    })();
    return () => {
      cancelled = true;
    };
  }, [dropId]);

  const handleLift = useCallback(async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setBusy(true);

    const wasLifted = liftedRef.current;
    const optimisticNext = !wasLifted;
    setLifted(optimisticNext);
    liftedRef.current = optimisticNext;
    onLiftCountChange((c) => Math.max(0, c + (optimisticNext ? 1 : -1)));

    try {
      const { lifted: serverLifted } = await toggleDropLift(dropId);
      setLifted(serverLifted);
      liftedRef.current = serverLifted;
    } catch (e) {
      setLifted(wasLifted);
      liftedRef.current = wasLifted;
      onLiftCountChange((c) => Math.max(0, c + (wasLifted ? 1 : -1)));
      setToast(e instanceof Error ? e.message : 'Could not update lift');
      setTimeout(() => setToast(null), 2500);
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }, [dropId, onLiftCountChange]);

  const scrollEchoes = () => {
    document.getElementById('drop-echoes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onShare = async () => {
    const url =
      typeof window !== 'undefined' ? `${window.location.origin}/drop/${encodeURIComponent(dropId)}` : '';
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Ruehl drop', url });
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
    <div
      className={`relative flex flex-col items-stretch py-2 ${embedded ? '' : 'mt-6 border-y border-zinc-800 py-3'}`}
    >
      {toast ? (
        <p
          className={`z-10 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-200 ${
            embedded
              ? 'relative mx-auto mb-2 block w-fit'
              : 'absolute -top-8 left-1/2 -translate-x-1/2'
          }`}
        >
          {toast}
        </p>
      ) : null}
      <div className="flex items-center justify-around">
      <button
        type="button"
        onClick={() => void handleLift()}
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
        onClick={scrollEchoes}
        className="flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
      >
        <MessageCircle className="h-5 w-5" strokeWidth={2} />
        <span className="font-semibold tabular-nums">{echoCount}</span>
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">Echoes</span>
      </button>
      <button
        type="button"
        onClick={() => void onShare()}
        className="flex flex-col items-center gap-1 rounded-lg px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
      >
        <Share2 className="h-5 w-5" strokeWidth={2} />
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">Share</span>
      </button>
      </div>
    </div>
  );
}
