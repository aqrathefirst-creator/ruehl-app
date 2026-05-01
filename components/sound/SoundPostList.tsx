'use client';

import Link from 'next/link';
import Image from 'next/image';
import AuthorBlock from '@/components/shared/AuthorBlock';
import { formatRelativeShort } from '@/lib/formatRelativeShort';
import type { SoundDetailPost } from '@/lib/ruehl/queries/sound';

type Props = {
  posts: SoundDetailPost[];
};

export default function SoundPostList({ posts }: Props) {
  if (posts.length === 0) {
    return <p className="py-8 text-center text-sm text-zinc-500">No posts using this sound yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {posts.map((post) => (
        <li
          key={post.id}
          className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40 transition hover:border-zinc-700 hover:bg-zinc-900/30"
        >
          <div className="p-4 pb-2">
            <AuthorBlock
              username={post.username}
              avatarUrl={post.avatarUrl}
              badgeStatus={post.badgeStatus}
              legacyIsVerified={post.legacyVerified}
              meta={formatRelativeShort(post.created_at)}
              size="sm"
            />
          </div>
          <Link
            href={`/post/${post.id}`}
            className="block px-4 pb-4 pt-0 outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            {post.media_url ? (
              <div className="relative mb-3 aspect-video w-full overflow-hidden rounded-xl bg-zinc-900">
                <Image
                  src={post.media_url}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="(max-width:672px) 100vw, 672px"
                />
              </div>
            ) : null}

            {post.content ? (
              <p className="line-clamp-2 text-sm text-zinc-200">{post.content}</p>
            ) : null}

            {post.liftCount > 0 ? (
              <p className="mt-2 text-xs text-zinc-500">
                {post.liftCount} {post.liftCount === 1 ? 'lift' : 'lifts'}
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
