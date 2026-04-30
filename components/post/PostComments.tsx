'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import CommentCard from './CommentCard';
import CommentComposer from './CommentComposer';

export type LoadedComment = {
  id: string;
  content: string | null;
  created_at: string | null;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
};

type Props = {
  postId: string;
  onCommentPosted?: () => void;
};

function mapCommentRows(
  data: unknown,
): LoadedComment[] {
  const rows = (data ?? []) as Array<{
    id: string;
    content: string | null;
    created_at: string | null;
    user_id: string;
    profiles: { username: string | null; avatar_url: string | null } | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    created_at: r.created_at,
    user_id: r.user_id,
    username: r.profiles?.username ?? null,
    avatar_url: r.profiles?.avatar_url ?? null,
  }));
}

export default function PostComments({ postId, onCommentPosted }: Props) {
  const { user } = useUser();
  const [comments, setComments] = useState<LoadedComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      const { data, error } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id, profiles(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (error) {
        setComments([]);
      } else {
        setComments(mapCommentRows(data));
      }
      setLoading(false);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const handlePosted = useCallback(
    (row: LoadedComment) => {
      setComments((prev) => [...prev, row]);
      onCommentPosted?.();
    },
    [onCommentPosted],
  );

  return (
    <section id="post-comments" className="mt-8 border-t border-zinc-800 pt-6">
      <h2 className="mb-4 text-lg font-semibold text-zinc-100">Comments</h2>
      {user ? <CommentComposer postId={postId} onPosted={handlePosted} /> : null}
      {loading ? (
        <p className="text-sm text-zinc-500">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-zinc-500">No comments yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-900">
          {comments.map((c) => (
            <CommentCard key={c.id} comment={c} />
          ))}
        </ul>
      )}
    </section>
  );
}
