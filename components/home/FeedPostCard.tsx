'use client';

import Image from 'next/image';
import Link from 'next/link';
import AuthorBlock from '@/components/shared/AuthorBlock';
import { formatRelativeShort } from '@/lib/formatRelativeShort';
import type { NowFeedItem } from '@/lib/ruehl/queries/nowFeed';
import { nowFeedPrimaryMediaUrl } from '@/lib/ruehl/queries/nowFeed';

type Props = { item: Extract<NowFeedItem, { type: 'post' }> };

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url);
}

export default function FeedPostCard({ item }: Props) {
  const { post, author, commentCount } = item;
  const un = String(author?.username || 'user').replace(/^@+/, '');
  const mediaUrl = nowFeedPrimaryMediaUrl(post);
  const lifts = post.liftCount ?? 0;

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40 transition hover:border-zinc-700">
      <div className="px-4 pt-4 pb-3">
        <AuthorBlock
          username={un}
          avatarUrl={author?.avatar_url}
          badgeStatus={author?.badge_verification_status ?? null}
          legacyIsVerified={author?.is_verified}
          meta={formatRelativeShort(post.created_at)}
          size="md"
        />
      </div>

      <Link href={`/post/${post.id}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
        {mediaUrl ? (
          <div className="relative aspect-square w-full overflow-hidden bg-zinc-900">
            {isVideoUrl(mediaUrl) ? (
              <video src={mediaUrl} className="h-full w-full object-cover" controls muted playsInline preload="metadata" />
            ) : (
              <Image src={mediaUrl} alt="" fill className="object-cover" unoptimized sizes="(max-width:672px) 100vw, 672px" />
            )}
          </div>
        ) : null}

        {post.content ? (
          <div className="px-4 py-3">
            <p className="line-clamp-4 whitespace-pre-wrap text-zinc-200">{post.content}</p>
          </div>
        ) : null}

        {lifts > 0 || commentCount > 0 ? (
          <div className="px-4 pb-3 text-xs text-zinc-500">
            {[
              lifts > 0 ? `${lifts} ${lifts === 1 ? 'lift' : 'lifts'}` : null,
              commentCount > 0 ? `${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        ) : null}
      </Link>
    </article>
  );
}
