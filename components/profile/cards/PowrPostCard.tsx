'use client';

import Image from 'next/image';
import Link from 'next/link';
import AuthorBlock from '@/components/shared/AuthorBlock';
import type { BadgeVerificationStatus } from '@/lib/ruehl/accountTypes';
import { formatRelativeShort } from '@/lib/formatRelativeShort';
import type { RuehlPost } from '@/lib/ruehl/types';

type Props = {
  post: RuehlPost;
  profileUsername: string | null;
  profileAvatarUrl?: string | null;
  profileBadgeStatus: BadgeVerificationStatus;
  profileIsVerified: boolean | null;
};

export default function PowrPostCard({
  post,
  profileUsername,
  profileAvatarUrl,
  profileBadgeStatus,
  profileIsVerified,
}: Props) {
  const body = String(post.content || '').trim();
  const media = String(post.media_url || '').trim() || (post.media_urls?.[0] ? String(post.media_urls[0]).trim() : '');
  const lifts = post.liftCount ?? 0;
  const un = String(profileUsername || 'user').replace(/^@+/, '');
  const meta = `${formatRelativeShort(post.created_at)} · ${lifts} lifts`;

  return (
    <article className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 transition hover:border-zinc-700 hover:bg-zinc-900/40">
      <AuthorBlock
        username={un}
        avatarUrl={profileAvatarUrl}
        badgeStatus={profileBadgeStatus}
        legacyIsVerified={profileIsVerified}
        meta={meta}
        size="sm"
        className="mb-3"
      />
      <Link href={`/post/${post.id}`} className="block rounded-lg outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-violet-500">
        {media ? (
          <div className="relative mb-2 aspect-video w-full overflow-hidden rounded-xl bg-zinc-900">
            <Image
              src={media}
              alt=""
              fill
              className="object-cover"
              unoptimized
              sizes="(max-width:672px) 100vw, 672px"
            />
          </div>
        ) : null}
        {body ? (
          <p className="line-clamp-4 text-[14px] leading-snug text-zinc-200">{body}</p>
        ) : (
          <p className="text-sm text-zinc-500">POWR post</p>
        )}
      </Link>
    </article>
  );
}
