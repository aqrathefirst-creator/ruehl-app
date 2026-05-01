import type { PostDetailPost } from '@/lib/ruehl/queries/post';

type Props = { post: PostDetailPost; embedded?: boolean };

export default function PostBody({ post, embedded }: Props) {
  const text = String(post.content || '').trim();
  if (!text) return null;

  return (
    <div
      className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed text-zinc-200 ${embedded ? '' : 'mt-4'}`}
    >
      {text}
    </div>
  );
}
