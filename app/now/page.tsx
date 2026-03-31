'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/purity */

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/lib/useUser';
import VerificationBadge from '@/components/VerificationBadge';

type Profile = {
  id: string;
  username: string;
  avatar_url?: string | null;
  verified?: boolean;
  activity_type?: string | null;
  shadow_banned?: boolean;
  suspended_until?: string | null;
};

type Post = {
  id: string;
  content: string;
  user_id: string;
  media_url?: string | null;
  created_at?: string;
  track_name?: string | null;
  artist_name?: string | null;
  sound_id?: string | null;
  activity_type?: string | null;
  hidden_by_admin?: boolean;
  discovery_disabled?: boolean;
};

type Like = {
  id: string;
  user_id: string;
  post_id: string;
};

type Comment = {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
};

type Lift = {
  id: string;
  user_id: string;
  post_id: string;
};

export default function NowFeedPage() {

  // ✅ GLOBAL USER
  const { user, profile } = useUser();

  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [lifts, setLifts] = useState<Lift[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  const [activeAudioPost, setActiveAudioPost] = useState<string | null>(null);
  const [animatingPost, setAnimatingPost] = useState<string | null>(null);
  const [activeCommentsPost, setActiveCommentsPost] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const postRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const handledDeepLinkRef = useRef<string | null>(null);

  const fetchData = async () => {
    const [{ data: postsData }, { data: profilesData }, { data: likesData }, { data: commentsData }, { data: liftsData }, { data: followingData }] = await Promise.all([
      supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(240),
      supabase.from('profiles').select('*'),
      supabase.from('likes').select('*'),
      supabase.from('comments').select('*'),
      supabase.from('post_lifts').select('*'),
      user?.id ? supabase.from('follows').select('following_id').eq('follower_id', user.id) : Promise.resolve({ data: [] as { following_id: string }[] }),
    ]);

    const nextProfiles = (profilesData || []) as Profile[];
    const nextPosts = (postsData || []) as Post[];
    const nextLifts = (liftsData || []) as Lift[];
    const nextFollowingIds = ((followingData || []) as { following_id: string }[]).map((item) => item.following_id);

    const profileMap = new Map(nextProfiles.map((item) => [item.id, item]));
    const ownId = user?.id || null;
    const liftCountByPost = nextLifts.reduce<Record<string, number>>((acc, item) => {
      acc[item.post_id] = (acc[item.post_id] || 0) + 1;
      return acc;
    }, {});

    const normalPosts = nextPosts.filter((post) => {
      if (post.hidden_by_admin === true || post.discovery_disabled === true) return false;
      if (post.user_id === ownId) return true;
      const profile = profileMap.get(post.user_id);
      return !profile?.shadow_banned;
    });

    // Reduced visibility: non-owner shadow banned content is heavily deprioritized.
    const reducedShadowPosts = nextPosts
      .filter((post) => {
        if (post.hidden_by_admin === true || post.discovery_disabled === true) return false;
        if (post.user_id === ownId) return false;
        const profile = profileMap.get(post.user_id);
        return !!profile?.shadow_banned;
      })
      .slice(0, 2);

    const basePosts = [...normalPosts, ...reducedShadowPosts];
    const distributablePosts = basePosts.filter((post) => {
      if (post.media_url) return true;
      return (liftCountByPost[post.id] || 0) > 0;
    });

    distributablePosts.sort((a, b) => {
      const aFollowed = nextFollowingIds.includes(a.user_id) ? 1 : 0;
      const bFollowed = nextFollowingIds.includes(b.user_id) ? 1 : 0;
      if (aFollowed !== bFollowed) return bFollowed - aFollowed;

      const aLift = liftCountByPost[a.id] || 0;
      const bLift = liftCountByPost[b.id] || 0;
      if (aLift !== bLift) return bLift - aLift;

      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });

    setPosts(distributablePosts);
    setProfiles(nextProfiles);
    setLikes(likesData || []);
    setComments(commentsData || []);
    setLifts(nextLifts);
    setFollowingIds(nextFollowingIds);
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  // ✅ SAFE PROFILE RESOLUTION
  const getProfile = (id: string) => {
    if (id === profile?.id) return profile; // 🔥 always prioritize current user
    return profiles.find(p => p.id === id);
  };

  const inferActivityType = (post: Post, userProfile?: Profile | null) => {
    if (userProfile?.activity_type) return userProfile.activity_type;
    const text = (post.content || '').toLowerCase();

    if (text.includes('run') || text.includes('jog')) return 'Run';
    if (text.includes('dance')) return 'Dance';
    if (text.includes('strength') || text.includes('resistance'))
      return 'Strength & Resistance Training';
    if (text.includes('flex') || text.includes('core') || text.includes('balance'))
      return 'Flexibility, Balance & Core';
    if (text.includes('yoga') || text.includes('stretch'))
      return 'Flexibility & Mobility';

    return 'Train';
  };

  const formatTimestamp = (createdAt?: string) => {
    if (!createdAt) return '';
    const date = new Date(createdAt);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  const getLikes = (postId: string) =>
    likes.filter(l => l.post_id === postId);

  const getComments = (postId: string) =>
    comments.filter(c => c.post_id === postId);

  const getLifts = (postId: string) =>
    lifts.filter(l => l.post_id === postId);

  const hasLiked = (postId: string) =>
    likes.some(l => l.post_id === postId && l.user_id === user?.id);

  const hasLifted = (postId: string) =>
    lifts.some(l => l.post_id === postId && l.user_id === user?.id);

  const toggleLike = async (postId: string) => {
    if (!user) return;

    const existing = likes.find(
      l => l.post_id === postId && l.user_id === user.id
    );

    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('likes').insert({
        user_id: user.id,
        post_id: postId,
      });

      if (navigator.vibrate) navigator.vibrate(10);
    }

    fetchData();
  };

  const handleDoubleTap = async (postId: string) => {
    if (!hasLiked(postId)) {
      await toggleLike(postId);
    }

    setAnimatingPost(postId);
    setTimeout(() => setAnimatingPost(null), 600);
  };

  const addComment = async () => {
    if (!newComment || !activeCommentsPost || !user) return;

    await supabase.from('comments').insert({
      content: newComment,
      user_id: user.id,
      post_id: activeCommentsPost,
    });

    setNewComment('');
    fetchData();
  };

  const toggleLift = async (postId: string) => {
    if (!user) return;

    const existing = lifts.find(
      l => l.post_id === postId && l.user_id === user.id
    );

    if (existing) {
      await supabase.from('post_lifts').delete().eq('id', existing.id);
    } else {
      await supabase.from('post_lifts').insert({
        user_id: user.id,
        post_id: postId,
      });

      if (navigator.vibrate) navigator.vibrate(10);
    }

    fetchData();
  };

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('now-live-engagement')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_lifts' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const targetPostId = searchParams.get('post');
    if (!targetPostId || handledDeepLinkRef.current === targetPostId) return;

    const targetPost = posts.find((post) => post.id === targetPostId);
    if (!targetPost) return;

    handledDeepLinkRef.current = targetPostId;
    postRefs.current[targetPostId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (searchParams.get('comments') === '1') {
      setActiveCommentsPost(targetPostId);
    }
  }, [posts, searchParams]);

  const closeComments = () => {
    setActiveCommentsPost(null);

    if (searchParams.get('post')) {
      router.replace('/now');
    }
  };

  return (
    <div className="w-full min-h-screen bg-white flex justify-center">

      <div className="w-full max-w-[420px] h-[100dvh] overflow-y-scroll snap-y snap-mandatory relative">

        {posts.map((post) => {
          const userProfile = getProfile(post.user_id);

          const likeCount = getLikes(post.id).length;
          const commentCount = getComments(post.id).length;
          const liftCount = getLifts(post.id).length;
          const liked = hasLiked(post.id);
          const lifted = hasLifted(post.id);
          const fromFollowed = followingIds.includes(post.user_id);

          return (
            <div
              key={post.id}
              ref={(node) => {
                postRefs.current[post.id] = node;
              }}
              className="h-[100dvh] w-full snap-start relative bg-black flex items-center justify-center"
              onDoubleClick={() => handleDoubleTap(post.id)}
            >

              {/* MEDIA */}
              {post.media_url && (
                <MediaPlayer
                  src={post.media_url}
                  postId={post.id}
                  activeAudioPost={activeAudioPost}
                  setActiveAudioPost={setActiveAudioPost}
                />
              )}

              {/* OVERLAY */}
              <div className="absolute inset-0 bg-black/30" />

              {/* TOP LEFT USER */}
              <div
                className="absolute top-4 left-4 flex items-center gap-2 text-white cursor-pointer"
                onClick={() => router.push(`/profile/${userProfile?.id}`)}
              >
                <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden">
                  {userProfile?.avatar_url && (
                    <img src={userProfile.avatar_url} alt={`${userProfile.username || 'User'} avatar`} className="w-full h-full object-cover" />
                  )}
                </div>

                <div className="text-sm font-semibold flex items-center gap-0">
                  {userProfile?.username || 'User'}
                  {userProfile?.verified && <VerificationBadge />}
                </div>
              </div>

              {/* HEART ANIMATION */}
              {animatingPost === post.id && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-white text-7xl animate-ping">♥</div>
                </div>
              )}

              {/* ACTIONS */}
              <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 text-white">

                <button onClick={() => toggleLike(post.id)}>
                  <span className="text-2xl">
                    {liked ? '♥' : '♡'}
                  </span>
                  {likeCount}
                </button>

                <button onClick={() => setActiveCommentsPost(post.id)}>
                  <span className="text-2xl">💬</span>
                  {commentCount}
                </button>

                <button onClick={() => toggleLift(post.id)}>
                  <span className={`text-2xl ${lifted ? 'text-cyan-300' : ''}`}>↻</span>
                  {liftCount}
                </button>

              </div>

              {/* TEXT STACK */}
              <div className="absolute bottom-12 left-4 right-20 text-white space-y-2">

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 text-[10px] uppercase tracking-widest font-semibold shadow-sm">
                  <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  {inferActivityType(post, userProfile)}
                </div>

                <div className="text-2xl font-extrabold leading-tight drop-shadow-lg">
                  {post.content}
                </div>

                {liftCount > 0 && (
                  <div className="inline-flex items-center gap-2 text-[11px] text-cyan-200 bg-cyan-500/20 border border-cyan-300/25 px-2.5 py-1 rounded-full">
                    Lifted by {liftCount} {liftCount === 1 ? 'user' : 'users'}
                  </div>
                )}

                {fromFollowed && (
                  <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-300">
                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                    From someone you follow
                  </div>
                )}

                {post.track_name && (
                  <button
                    type="button"
                    onClick={() =>
                      post.sound_id && router.push(`/sound/${post.sound_id}`)
                    }
                    className="inline-flex items-center gap-2 text-sm bg-white/20 px-3 py-1.5 rounded-xl hover:bg-white/35 transition-colors"
                  >
                    🎵 {post.track_name} — {post.artist_name}
                  </button>
                )}

                <div className="text-[11px] text-white/75">
                  {formatTimestamp(post.created_at)}
                </div>

              </div>

            </div>
          );
        })}

        {/* COMMENTS */}
        {activeCommentsPost && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-end z-50">

<div className="w-full max-w-[420px] h-[80%] bg-[#0f0f0f] border-t border-white/10 rounded-t-3xl flex flex-col shadow-2xl relative">

              <div className="p-5 font-bold text-center text-lg border-b border-white/10 text-white">
                Comments
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {getComments(activeCommentsPost).map(c => {
                  const commentUser = getProfile(c.user_id);

                  return (
                    <div key={c.id} className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <div className="font-semibold text-sm text-white flex items-center gap-1">
                        {commentUser?.username}
                        {commentUser?.verified && <VerificationBadge />}
                      </div>
                      <p className="text-sm text-gray-300 mt-1">{c.content}</p>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 flex gap-2 border-t border-white/10">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder:text-gray-500 focus:border-purple-500"
                  placeholder="Add a comment..."
                />

                <button
                  onClick={addComment}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium active:shadow-md transition-all"
                >
                  Send
                </button>
              </div>

              <button
                onClick={closeComments}
                className="absolute top-4 right-4 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 active:bg-white/30 transition-colors"
              >
                ✕
              </button>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ================= MEDIA PLAYER ================= */

function MediaPlayer({
  src,
  postId,
  activeAudioPost,
  setActiveAudioPost,
}: any) {
  const ref = useRef<HTMLVideoElement | null>(null);

  const isVideo = src.match(/\.(mp4|webm|mov)$/i);
  const isActive = activeAudioPost === postId;

  useEffect(() => {
    if (!isVideo || !ref.current) return;
    ref.current.muted = !isActive;
  }, [isActive]);

  useEffect(() => {
    if (!isVideo || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) ref.current?.play();
        else ref.current?.pause();
      },
      { threshold: 0.6 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const toggleSound = () => {
    setActiveAudioPost(isActive ? null : postId);
  };

  if (isVideo) {
    return (
      <div className="absolute inset-0">
        <video
          ref={ref}
          src={src}
          loop
          playsInline
          preload="auto"
          onClick={toggleSound}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="Post media"
      className="absolute inset-0 w-full h-full object-contain"
    />
  );
}