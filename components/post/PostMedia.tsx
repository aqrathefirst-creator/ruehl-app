'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import { getPostMediaRenderKind, primaryMediaUrls } from '@/lib/ruehl/postMedia';
import type { PostDetailPost } from '@/lib/ruehl/queries/post';

type Props = {
  post: PostDetailPost;
  authorUserId: string;
  /** Detail card layout — media sits flush in card strip without nested frames */
  embedded?: boolean;
};

async function signIfOwnedPath(
  raw: string,
  bucket: 'post-media-private' | 'post-voice-private',
  viewerId: string,
  authorId: string,
): Promise<string> {
  const path = raw.trim();
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (!viewerId || viewerId !== authorId) return path;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return path;
  const res = await fetch('/api/storage/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ bucket, path }),
  });
  if (!res.ok) return path;
  const j = (await res.json()) as { url?: string };
  return j.url || path;
}

export default function PostMedia({ post, authorUserId, embedded }: Props) {
  const { user } = useUser();
  const viewerId = user?.id ?? null;
  const wrapRef = useRef<HTMLDivElement>(null);

  const mediaUrlsSerialized = useMemo(() => {
    const mu = post.media_urls as unknown;
    if (Array.isArray(mu)) return mu.filter((x): x is string => typeof x === 'string').join('\x1f');
    if (typeof mu === 'string') return mu;
    return '';
  }, [post.media_urls]);

  const rawUrls = useMemo(
    () => primaryMediaUrls(post),
    [post.id, post.media_url ?? '', mediaUrlsSerialized],
  );

  const voiceRaw = useMemo(
    () => String(post.voice_url || post.audio_url || '').trim(),
    [post.voice_url, post.audio_url],
  );

  const [urls, setUrls] = useState<string[]>([]);
  const [ix, setIx] = useState(0);
  const [voiceSrc, setVoiceSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const resolved: string[] = [];
      for (const u of rawUrls) {
        const out = await signIfOwnedPath(u, 'post-media-private', viewerId || '', authorUserId);
        if (!cancelled) resolved.push(out || u);
      }
      if (!cancelled) setUrls(resolved.length ? resolved : rawUrls);
    })();
    return () => {
      cancelled = true;
    };
  }, [rawUrls, viewerId, authorUserId]);

  useEffect(() => {
    if (!post.has_voice && !voiceRaw) {
      setVoiceSrc(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const out = await signIfOwnedPath(voiceRaw, 'post-voice-private', viewerId || '', authorUserId);
      if (!cancelled) setVoiceSrc(out || voiceRaw || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [post.has_voice, voiceRaw, viewerId, authorUserId]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (urls.length < 2) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIx((i) => (i - 1 + urls.length) % urls.length);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIx((i) => (i + 1) % urls.length);
      }
    },
    [urls.length],
  );

  const current = urls[ix] || '';
  const renderKind = getPostMediaRenderKind({
    ...post,
    media_url: current || post.media_url,
  });

  const showVoice = Boolean(voiceSrc || (post.has_voice && (post.voice_url || post.audio_url)));
  const caption = String(post.voice_caption || '').trim();

  if (!current && !showVoice) {
    return null;
  }

  return (
    <div
      ref={wrapRef}
      role="region"
      aria-label="Post media"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
    >
      {current ? (
        <div
          className={`relative overflow-hidden bg-zinc-900 ${embedded ? '' : 'rounded-2xl ring-1 ring-zinc-800'}`}
        >
          {renderKind === 'video' ? (
            <video key={current} src={current} controls className="aspect-video w-full bg-black" playsInline />
          ) : (
            <div className="relative aspect-video w-full">
              <Image
                src={current}
                alt=""
                fill
                priority={ix === 0}
                className="object-contain"
                unoptimized
                sizes="(max-width:672px) 100vw, 672px"
              />
            </div>
          )}
          {urls.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => setIx((i) => (i - 1 + urls.length) % urls.length)}
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={() => setIx((i) => (i + 1) % urls.length)}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {urls.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${i === ix ? 'bg-violet-400' : 'bg-zinc-600'}`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {showVoice && voiceSrc ? (
        <div
          className={
            embedded
              ? `px-4 py-3 ${current ? 'border-t border-zinc-800/50' : ''}`
              : `rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 ${current ? 'mt-4' : ''}`
          }
        >
          {!embedded ? (
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400/80">Voice</p>
          ) : (
            <p className="sr-only">Voice attachment</p>
          )}
          <audio src={voiceSrc} controls className={`w-full ${embedded ? 'mt-0' : 'mt-3'}`} />
          {caption ? (
            <p className={`text-sm text-zinc-300 ${embedded ? 'mt-2' : 'mt-2'}`}>{caption}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
