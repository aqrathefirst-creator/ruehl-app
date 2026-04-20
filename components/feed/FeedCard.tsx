'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import type { RuehlPost, RuehlProfile } from '@/lib/ruehl/types';
import { isMediaPost, isPowrPost, resolvePostSound } from '@/lib/ruehl/posts';
import VerificationBadge from '@/components/profile/VerificationBadge';
import { playPreviewAudio, stopPreviewAudio } from '@/lib/previewAudio';

type Props = {
  post: RuehlPost;
  author: RuehlProfile | null;
  liftCount: number;
  hasLifted: boolean;
  isSaved: boolean;
  onToggleLift: () => Promise<void>;
  onToggleSave: () => Promise<void>;
  isVideoUrl: (url: string) => boolean;
};

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const d = Math.floor((Date.now() - t) / 1000);
  if (d < 60) return 'now';
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

const parseMediaUrlCandidates = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean);
        }
      } catch {
        return [];
      }
    }
    return [trimmed];
  }
  return [];
};

function primaryMediaUrl(post: RuehlPost): string {
  const candidates = [...parseMediaUrlCandidates(post.media_urls), ...parseMediaUrlCandidates(post.media_url)];
  return candidates[0] || '';
}

export default function FeedCard({
  post,
  author,
  liftCount,
  hasLifted,
  isSaved,
  onToggleLift,
  onToggleSave,
  isVideoUrl,
}: Props) {
  const [liftBusy, setLiftBusy] = useState(false);

  const displayLifts = liftCount;
  const displayLifted = hasLifted;

  const username = author?.username?.trim() || 'user';
  const profileHref = `/${encodeURIComponent(username)}`;

  const badgeStatus = author?.badge_verification_status ?? null;
  const legacyVerified =
    typeof author?.is_verified === 'boolean'
      ? author.is_verified
      : typeof (author as (RuehlProfile & { verified?: boolean | null }) | null)?.verified === 'boolean'
        ? Boolean((author as RuehlProfile & { verified?: boolean | null }).verified)
        : null;

  const handleLift = useCallback(async () => {
    if (liftBusy) return;
    setLiftBusy(true);
    try {
      await onToggleLift();
    } finally {
      setLiftBusy(false);
    }
  }, [liftBusy, onToggleLift]);

  const sound = resolvePostSound(post);
  const mediaUrl = primaryMediaUrl(post);
  const hasMedia = isMediaPost(post);
  const powr = isPowrPost(post);

  const onMediaClick = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[feed] Post detail not built yet — post id:', post.id);
    }
  };

  const onEcho = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[feed] Echo opens post detail — mobile records voice:', post.id);
    }
  };

  const onShare = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?post=${encodeURIComponent(post.id)}` : '';
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Ruehl', url });
      } catch {
        /* ignored */
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.log('[feed] share', url);
    }
  };

  return (
    <article className="border-b border-[var(--border-subtle)] py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <Link href={profileHref} className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
          {author?.avatar_url ? (
            <Image src={author.avatar_url} alt="" fill className="object-cover" unoptimized sizes="40px" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-[var(--text-muted)]">
              {username.slice(0, 1).toUpperCase()}
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link href={profileHref} className="truncate text-sm font-semibold text-[var(--text-primary)] hover:underline">
              @{username}
            </Link>
            <VerificationBadge status={badgeStatus} legacyIsVerified={legacyVerified} size="sm" />
            <span className="text-xs text-[var(--text-muted)]">{formatTime(post.created_at)}</span>
          </div>

          {post.content && !(powr && !hasMedia) ? (
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-snug text-[var(--text-primary)]">{post.content}</p>
          ) : null}

          {sound && (
            <button
              type="button"
              onClick={() => {
                if (sound.previewUrl) void playPreviewAudio(`feed:${post.id}`, sound.previewUrl);
              }}
              onMouseLeave={() => stopPreviewAudio()}
              className="mt-2 inline-flex max-w-full items-center gap-2 rounded-[var(--radius-pill)] border border-[var(--border-medium)] bg-[var(--bg-secondary)] px-3 py-1.5 text-left text-xs font-medium text-[var(--text-secondary)]"
            >
              <span aria-hidden>🎵</span>
              <span className="truncate">
                {sound.trackName || 'Sound'} {sound.artistName ? `— ${sound.artistName}` : ''}
              </span>
            </button>
          )}

          {hasMedia && mediaUrl && (
            <button type="button" onClick={onMediaClick} className="relative mt-3 block w-full overflow-hidden rounded-[var(--radius-card)] bg-black">
              <div className="relative aspect-[4/5] w-full max-h-[min(70vh,560px)]">
                {isVideoUrl(mediaUrl) ? (
                  <video src={mediaUrl} className="h-full w-full object-cover" muted playsInline loop autoPlay controls={false} />
                ) : (
                  <Image src={mediaUrl} alt="" fill className="object-cover" unoptimized sizes="(max-width: 600px) 100vw, 600px" />
                )}
              </div>
            </button>
          )}

          {powr && !hasMedia && (
            <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">POWR</p>
              <p className="mt-1 text-[15px] leading-relaxed text-[var(--text-primary)]">{post.content}</p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <button
              type="button"
              disabled={liftBusy}
              onClick={() => void handleLift()}
              className={`font-semibold ${displayLifted ? 'text-[var(--accent-violet)]' : 'text-[var(--text-secondary)]'}`}
            >
              Lift {displayLifts > 0 ? displayLifts : ''}
            </button>
            <button type="button" onClick={onEcho} className="font-semibold text-[var(--text-secondary)]">
              Echo
            </button>
            <button type="button" onClick={() => void onShare()} className="font-semibold text-[var(--text-secondary)]">
              Share
            </button>
            <button
              type="button"
              onClick={() => void onToggleSave()}
              className={`font-semibold ${isSaved ? 'text-[var(--accent-violet)]' : 'text-[var(--text-secondary)]'}`}
            >
              {isSaved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
