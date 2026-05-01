'use client';

import Image from 'next/image';
import Link from 'next/link';
import AuthorBlock from '@/components/shared/AuthorBlock';
import { formatRelativeShort } from '@/lib/formatRelativeShort';
import type { LiftedPostForProfile } from '@/lib/ruehl/queries/profileTabs';
import AppViewCta from '@/components/profile/cards/AppViewCta';

type Props = { post: LiftedPostForProfile };

export default function LiftedItemCard({ post }: Props) {
  const body = String(post.content || '').trim();
  const media = String(post.media_url || '').trim() || (post.media_urls?.[0] ? String(post.media_urls[0]).trim() : '');
  const un = post.authorUsername?.trim() || 'unknown';
  const meta = formatRelativeShort(post.created_at);

  return (
    <article className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
      <AuthorBlock
        username={un}
        avatarUrl={post.authorAvatarUrl}
        badgeStatus={post.authorBadgeVerificationStatus ?? null}
        legacyIsVerified={post.authorIsVerified}
        meta={meta}
        size="sm"
        className="mb-3"
      />
      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400/80">Lifted post</p>
      <Link href={`/post/${post.id}`} className="mt-2 block">
        {media ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-900">
            <Image src={media} alt="" fill className="object-cover" unoptimized sizes="(max-width:672px) 100vw, 672px" />
          </div>
        ) : null}
        {body ? (
          <p className="mt-2 line-clamp-3 text-[14px] text-zinc-200">{body}</p>
        ) : !media ? (
          <p className="mt-2 text-sm text-zinc-500">Post</p>
        ) : null}
      </Link>
      <AppViewCta />
    </article>
  );
}
