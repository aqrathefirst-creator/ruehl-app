'use client';

import { useCallback, useMemo, useState } from 'react';
import type { PostDetailPageData } from '@/lib/ruehl/queries/post';
import { primaryMediaUrls } from '@/lib/ruehl/postMedia';
import { resolvePostSound } from '@/lib/ruehl/posts';
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

  const onCommentPosted = useCallback(() => {
    setCommentCount((c) => c + 1);
  }, []);

  const voiceHint = String(post.voice_url || post.audio_url || '').trim();
  const showMediaSection =
    primaryMediaUrls(post).length > 0 || Boolean(voiceHint) || Boolean(post.has_voice);
  const hasCaption = Boolean(String(post.content || '').trim());
  const hasSound = Boolean(resolvePostSound(post));

  return (
    <article className="pb-16">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80">
        <div className="border-b border-zinc-800/50 px-4 pt-4 pb-3">
          <PostAuthor post={post} author={author} embedded />
        </div>

        {showMediaSection ? (
          <div className="border-b border-zinc-800/50 bg-zinc-950">
            <PostMedia post={post} authorUserId={post.user_id} embedded />
          </div>
        ) : null}

        {hasCaption ? (
          <div className="border-b border-zinc-800/50 px-4 py-3">
            <PostBody post={post} embedded />
          </div>
        ) : null}

        {hasSound ? (
          <div className="border-b border-zinc-800/50 px-4 py-3">
            <PostMusic post={post} embedded />
          </div>
        ) : null}

        <div className="px-4 py-3">
          <PostEngagementBar
            postId={post.id}
            liftCount={liftCount}
            onLiftCountChange={setLiftCount}
            commentCount={commentCount}
            hideShare={Boolean(post.hide_shares)}
            embedded
          />
        </div>
      </div>

      <div className="mt-6">
        <PostComments postId={post.id} onCommentPosted={onCommentPosted} />
      </div>
    </article>
  );
}
