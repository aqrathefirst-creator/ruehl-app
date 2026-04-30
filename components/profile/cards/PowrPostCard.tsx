import Image from 'next/image';
import type { RuehlPost } from '@/lib/ruehl/types';
import AppViewCta from '@/components/profile/cards/AppViewCta';

type Props = { post: RuehlPost };

export default function PowrPostCard({ post }: Props) {
  const body = String(post.content || '').trim();
  const media = String(post.media_url || '').trim() || (post.media_urls?.[0] ? String(post.media_urls[0]).trim() : '');
  const lifts = post.liftCount ?? 0;

  return (
    <article className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
      {media ? (
        <div className="relative mb-2 aspect-video w-full overflow-hidden rounded-xl bg-zinc-900">
          <Image src={media} alt="" fill className="object-cover" unoptimized sizes="(max-width:672px) 100vw, 672px" />
        </div>
      ) : null}
      {body ? (
        <p className="line-clamp-4 text-[14px] leading-snug text-zinc-200">{body}</p>
      ) : (
        <p className="text-sm text-zinc-500">POWR post</p>
      )}
      <p className="mt-2 text-[11px] text-zinc-500">{lifts} lifts</p>
      <AppViewCta />
    </article>
  );
}
