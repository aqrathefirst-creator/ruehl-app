'use client';
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import VerificationBadge from '@/components/VerificationBadge';

type AuthUser = { id: string };

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  verified?: boolean;
};

type PowrPost = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile?: Profile;
};

type Like = { id: string; user_id: string; post_id: string };
type Lift = { id: string; user_id: string; post_id: string };
type Comment = {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
};

type PostRow = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: Profile[] | null;
};

type ScoredPost = PowrPost & { score: number };

const PAGE_SIZE = 24;

export default function PowrFeedPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [posts, setPosts] = useState<PowrPost[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [lifts, setLifts] = useState<Lift[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');

  async function fetchUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setUser((session?.user as AuthUser | null) || null);
  }

  async function fetchPosts(pageNumber = 0, reset = true) {
    if (!user) return;
    setLoading(true);

    const from = pageNumber * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const [{ data, error }, { data: likesData }, { data: liftsData }, { data: commentsData }] = await Promise.all([
      supabase
        .from('posts')
        .select(
          `
          id,
          content,
          created_at,
          user_id,
          profiles (
            id,
            username,
            avatar_url,
            verified
          )
        `
        )
        .is('media_url', null)
        .order('created_at', { ascending: false })
        .range(from, to),
      supabase.from('likes').select('id, user_id, post_id'),
      supabase.from('post_lifts').select('id, user_id, post_id'),
      supabase.from('comments').select('id, user_id, post_id, content, created_at'),
    ]);

    if (error) {
      setLoading(false);
      return;
    }

    const nextLikes = (likesData || []) as Like[];
    const nextLifts = (liftsData || []) as Lift[];
    const nextComments = (commentsData || []) as Comment[];
    const postRows = (data || []) as PostRow[];

    setLikes(nextLikes);
    setLifts(nextLifts);
    setComments(nextComments);

    const interactedPostIds = new Set<string>([
      ...nextLikes.filter((item) => item.user_id === user.id).map((item) => item.post_id),
      ...nextLifts.filter((item) => item.user_id === user.id).map((item) => item.post_id),
      ...nextComments.filter((item) => item.user_id === user.id).map((item) => item.post_id),
    ]);

    const likesByPost = nextLikes.reduce<Record<string, number>>((acc, row) => {
      acc[row.post_id] = (acc[row.post_id] || 0) + 1;
      return acc;
    }, {});

    const liftsByPost = nextLifts.reduce<Record<string, number>>((acc, row) => {
      acc[row.post_id] = (acc[row.post_id] || 0) + 1;
      return acc;
    }, {});

    const commentsByPost = nextComments.reduce<Record<string, number>>((acc, row) => {
      acc[row.post_id] = (acc[row.post_id] || 0) + 1;
      return acc;
    }, {});

    const scored: ScoredPost[] = postRows.map((row) => {
      const profile = Array.isArray(row.profiles) && row.profiles.length > 0 ? row.profiles[0] : undefined;

      const likeCount = likesByPost[row.id] || 0;
      const liftCount = liftsByPost[row.id] || 0;
      const commentCount = commentsByPost[row.id] || 0;

      const ageHours = (Date.now() - new Date(row.created_at).getTime()) / 1000 / 60 / 60;
      const engagement = likeCount * 2 + commentCount * 3 + liftCount * 5;
      const velocity = engagement / (ageHours + 1);
      const affinityBoost = interactedPostIds.has(row.id) ? 5 : 0;

      return {
        id: row.id,
        content: row.content,
        created_at: row.created_at,
        user_id: row.user_id,
        profile,
        score: engagement + velocity * 4 + affinityBoost - ageHours * 0.5,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    setPosts((prev) => (reset ? scored : [...prev, ...scored]));
    setLoading(false);
  }

  const getLikeCount = (postId: string) => likes.filter((row) => row.post_id === postId).length;
  const getLiftCount = (postId: string) => lifts.filter((row) => row.post_id === postId).length;
  const getCommentCount = (postId: string) => comments.filter((row) => row.post_id === postId).length;

  const hasLiked = (postId: string) => likes.some((row) => row.post_id === postId && row.user_id === user?.id);
  const hasLifted = (postId: string) => lifts.some((row) => row.post_id === postId && row.user_id === user?.id);

  const activeComments = useMemo(() => {
    if (!activeCommentsPostId) return [];
    return comments
      .filter((row) => row.post_id === activeCommentsPostId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [activeCommentsPostId, comments]);

  const getCommentAuthor = (comment: Comment) => {
    const post = posts.find((item) => item.user_id === comment.user_id);
    return post?.profile?.username || 'user';
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;

    const existing = likes.find((row) => row.post_id === postId && row.user_id === user.id);
    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('likes').insert({ user_id: user.id, post_id: postId });
      if (navigator.vibrate) navigator.vibrate(8);
    }

    await fetchPosts(0, true);
  };

  const toggleLift = async (postId: string) => {
    if (!user) return;

    const existing = lifts.find((row) => row.post_id === postId && row.user_id === user.id);
    if (existing) {
      await supabase.from('post_lifts').delete().eq('id', existing.id);
    } else {
      await supabase.from('post_lifts').insert({ user_id: user.id, post_id: postId });
      if (navigator.vibrate) navigator.vibrate(8);
    }

    await fetchPosts(0, true);
  };

  const addComment = async () => {
    if (!user || !activeCommentsPostId || !commentInput.trim()) return;

    await supabase.from('comments').insert({
      user_id: user.id,
      post_id: activeCommentsPostId,
      content: commentInput.trim(),
    });

    setCommentInput('');
    await fetchPosts(0, true);
  };

  useEffect(() => {
    void fetchUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    void fetchPosts(0, true);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('powr-live-engagement')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => void fetchPosts(0, true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => void fetchPosts(0, true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => void fetchPosts(0, true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_lifts' }, () => void fetchPosts(0, true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-[#090909] text-white flex justify-center">
      <div className="w-full max-w-[440px] px-4 py-5">
        <div className="sticky top-0 z-20 bg-[#090909]/95 backdrop-blur border-b border-white/10 pb-3 mb-4">
          <h1 className="text-lg font-semibold">Powr</h1>
          <p className="text-xs text-gray-400 mt-1">Tap in, comment live, and lift posts into broader distribution.</p>
        </div>

        <div className="space-y-4">
          {posts.map((post) => {
            const liked = hasLiked(post.id);
            const lifted = hasLifted(post.id);
            const likeCount = getLikeCount(post.id);
            const commentCount = getCommentCount(post.id);
            const liftCount = getLiftCount(post.id);

            return (
              <article key={post.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-3">
                  {post.profile?.avatar_url ? (
                    <img src={post.profile.avatar_url} alt={`${post.profile.username} avatar`} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/10" />
                  )}
                  <div>
                    <div className="text-sm font-semibold flex items-center gap-1">
                      {post.profile?.username || 'user'}
                      {post.profile?.verified && <VerificationBadge />}
                    </div>
                    <div className="text-[11px] text-gray-500">{new Date(post.created_at).toLocaleString()}</div>
                  </div>
                </div>

                <p className="mt-3 text-[15px] leading-relaxed text-gray-100">{post.content}</p>

                {liftCount > 0 && (
                  <div className="mt-2 text-[11px] text-cyan-300">Lifted by {liftCount} {liftCount === 1 ? 'user' : 'users'}</div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleLike(post.id)}
                    className={`h-10 px-3 rounded-xl border text-sm transition-all ${liked ? 'border-rose-400/50 bg-rose-500/15 text-rose-300' : 'border-white/15 bg-white/5 text-gray-300 hover:text-white'}`}
                  >
                    ♥ {likeCount}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCommentsPostId(post.id)}
                    className="h-10 px-3 rounded-xl border border-white/15 bg-white/5 text-gray-300 hover:text-white text-sm"
                  >
                    💬 {commentCount}
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleLift(post.id)}
                    className={`h-10 px-3 rounded-xl border text-sm transition-all ${lifted ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-300' : 'border-white/15 bg-white/5 text-gray-300 hover:text-white'}`}
                  >
                    ↻ {liftCount}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {loading && <div className="text-center text-gray-500 text-sm py-6">Loading Powr...</div>}
      </div>

      {activeCommentsPostId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={() => setActiveCommentsPostId(null)}>
          <div className="w-full max-w-[440px] h-[78vh] bg-[#0d0d0d] rounded-t-3xl border border-white/10 flex flex-col" onClick={(event) => event.stopPropagation()}>
            <div className="px-5 py-4 border-b border-white/10 text-center font-semibold">Comments</div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {activeComments.map((comment) => (
                <div key={comment.id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="text-xs text-gray-400">{getCommentAuthor(comment)}</div>
                  <div className="text-sm text-gray-200 mt-1">{comment.content}</div>
                </div>
              ))}
              {activeComments.length === 0 && <div className="text-center text-xs text-gray-500 pt-8">No comments yet.</div>}
            </div>

            <div className="p-3 border-t border-white/10 flex items-center gap-2">
              <input
                value={commentInput}
                onChange={(event) => setCommentInput(event.target.value)}
                placeholder="Add a comment..."
                className="flex-1 h-11 rounded-xl bg-white/10 border border-white/20 px-3 text-sm text-white placeholder:text-gray-500"
              />
              <button
                type="button"
                onClick={() => void addComment()}
                className="h-11 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
