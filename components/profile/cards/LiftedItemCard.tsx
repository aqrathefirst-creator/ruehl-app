import Image from 'next/image';
import type { RuehlPost } from '@/lib/ruehl/types';
import AppViewCta from '@/components/profile/cards/AppViewCta';

type Props = { post: RuehlPost };

export default function LiftedItemCard({ post }: Props) {
  const body = String(post.content || '').trim();
  const media = String(post.media_url || '').trim() || (post.media_urls?.[0] ? String(post.media_urls[0]).trim() : '');

  return (
    <article className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400/80">Lifted post</p>
      {media ? (
        <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-xl bg-zinc-900">
          <Image src={media} alt="" fill className="object-cover" unoptimized sizes="(max-width:672px) 100vw, 672px" />
        </div>
      ) : null}
      {body ? (
        <p className="mt-2 line-clamp-3 text-[14px] text-zinc-200">{body}</p>
      ) : !media ? (
        <p className="mt-2 text-sm text-zinc-500">Post</p>
      ) : null}
      <AppViewCta />
    </article>
  );
}
