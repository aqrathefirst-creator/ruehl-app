'use client';

import Image from 'next/image';
import Link from 'next/link';

type Props = {
  post: {
    id: string;
    media_url?: string | null;
    media_urls?: string[] | null;
    media_type?: string | null;
    thumbnail_url?: string | null;
  };
};

export default function MediaPostThumbnail({ post }: Props) {
  const primary = String(post.media_url || '').trim();
  const firstCarousel = post.media_urls?.map((u) => String(u || '').trim()).find(Boolean) ?? '';
  const url = primary || firstCarousel || null;
  if (!url) return null;

  const isVideo =
    post.media_type === 'video' || /\.(mp4|mov|webm|m3u8)$/i.test(url);
  const hasCarousel = (post.media_urls?.filter((u) => !!String(u || '').trim()).length ?? 0) > 1;

  return (
    <Link
      href={`/post/${post.id}`}
      className="relative block aspect-square overflow-hidden bg-zinc-900 transition-opacity hover:opacity-90"
    >
      {isVideo ? (
        <>
          <video
            src={url}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
          <div className="pointer-events-none absolute bottom-1.5 right-1.5 text-[11px] text-white drop-shadow">▶</div>
        </>
      ) : (
        <Image src={url} alt="" fill className="object-cover" unoptimized sizes="(max-width: 672px) 33vw, 224px" />
      )}
      {hasCarousel ? (
        <div className="pointer-events-none absolute right-1.5 top-1.5 rounded bg-black/40 px-1 text-[11px] text-white">
          ⊞
        </div>
      ) : null}
    </Link>
  );
}
