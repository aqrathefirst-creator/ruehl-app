import type { PostDetailPost } from '@/lib/ruehl/queries/post';

type Props = { post: PostDetailPost };

export default function PostBody({ post }: Props) {
  const text = String(post.content || '').trim();
  if (!text) return null;

  return (
    <div className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-zinc-200">{text}</div>
  );
}
