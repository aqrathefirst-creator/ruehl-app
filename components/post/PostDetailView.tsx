'use client';

import { useMemo, useState } from 'react';
import type { PostDetailPageData } from '@/lib/ruehl/queries/post';
import PostAuthor from '@/components/post/PostAuthor';
import PostMedia from '@/components/post/PostMedia';
import PostBody from '@/components/post/PostBody';
import PostMusic from '@/components/post/PostMusic';
import PostEngagementBar from '@/components/post/PostEngagementBar';
import PostComments from '@/components/post/PostComments';

type Props = {
  initial: PostDetailPageData;
};

export default function PostDetailView({ initial }: Props) {
  const [commentCount, setCommentCount] = useState(initial.commentCount);
  const [liftCount, setLiftCount] = useState(initial.post.liftCount ?? 0);

  const post = useMemo(() => initial.post, [initial.post]);
  const author = initial.author;

  return (
    <article className="pb-16">
      <PostMedia post={post} authorUserId={post.user_id} />
      <PostAuthor post={post} author={author} />
      <PostBody post={post} />
      <PostMusic post={post} />
      <PostEngagementBar
        postId={post.id}
        liftCount={liftCount}
        onLiftCountChange={setLiftCount}
        commentCount={commentCount}
        hideShare={Boolean(post.hide_shares)}
      />
      <PostComments postId={post.id} onCommentPosted={() => setCommentCount((c) => c + 1)} />
    </article>
  );
}
