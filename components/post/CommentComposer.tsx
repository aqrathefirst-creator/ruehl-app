'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import type { LoadedComment } from './PostComments';

type Props = {
  postId: string;
  onPosted: (row: LoadedComment) => void;
};

export default function CommentComposer({ postId, onPosted }: Props) {
  const { user, profile } = useUser();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!user?.id || !text.trim()) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: text.trim(),
      })
      .select('id, content, created_at, user_id')
      .single();

    if (!error && data) {
      onPosted({
        ...data,
        username: profile?.username ?? null,
        avatar_url: profile?.avatar_url ?? null,
      });
      setText('');
    }
    setSubmitting(false);
  }

  if (!user) return null;

  return (
    <div className="mb-6">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment..."
        className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        rows={2}
      />
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={submitting || !text.trim()}
        className="mt-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
      >
        Post
      </button>
    </div>
  );
}
