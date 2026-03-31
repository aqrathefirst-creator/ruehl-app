'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/purity */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import VerificationBadge from '@/components/VerificationBadge';

type Post = {
  id: string;
  content: string;
  user_id: string;
  media_url?: string | null;
  created_at?: string;
  hidden_by_admin?: boolean;
  discovery_disabled?: boolean;
};

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  verified?: boolean;
  shadow_banned?: boolean;
  suspended_until?: string | null;
};

type Comment = {
  id: string;
  post_id: string;
};

type Like = {
  id: string;
  post_id: string;
};

type Follow = {
  follower_id: string;
  following_id: string;
};

export default function ExplorePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [suggestedUsers, setSuggestedUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  const init = useCallback(async () => {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    setCurrentUser(user);

    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .order('id', { ascending: false });

    const { data: profilesData } = await supabase.from('profiles').select('*');
    const { data: commentsData } = await supabase.from('comments').select('*');
    const { data: likesData } = await supabase.from('likes').select('*');
    const { data: followsData } = await supabase.from('follows').select('*');

    const visibleProfiles = ((profilesData || []) as Profile[]).filter((item) => !item.shadow_banned);
    const visibleProfileIds = new Set(visibleProfiles.map((item) => item.id));
    const visiblePosts = ((postsData || []) as Post[]).filter(
      (item) => visibleProfileIds.has(item.user_id) && item.hidden_by_admin !== true && item.discovery_disabled !== true
    );

    setPosts(visiblePosts);
    setProfiles(visibleProfiles);
    setComments(commentsData || []);
    setLikes(likesData || []);
    if (user?.id && profilesData && followsData) {
      generateSuggestions(profilesData, followsData, user.id);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void init();
  }, [init]);

  const getProfile = (id: string) =>
    profiles.find((p) => p.id === id);

  const getPostScore = (post: Post) => {
    const likeCount = likes.filter(l => l.post_id === post.id).length;
    const commentCount = comments.filter(c => c.post_id === post.id).length;

    let recencyBoost = 0;

    if (post.created_at) {
      const postTime = new Date(post.created_at).getTime();
      const now = Date.now();
      const hours = (now - postTime) / (1000 * 60 * 60);
      recencyBoost = Math.max(0, 24 - hours);
    }

    return (likeCount * 2) + (commentCount * 3) + recencyBoost;
  };

  // FILTER + FALLBACK
  const filteredPosts = posts.filter(p => p.user_id !== currentUser?.id);

  const sortedPosts =
    filteredPosts.length > 0
      ? [...filteredPosts].sort((a, b) => getPostScore(b) - getPostScore(a))
      : [...posts].sort((a, b) => getPostScore(b) - getPostScore(a));

  const generateSuggestions = (
    profilesList: Profile[],
    followsList: Follow[],
    userId: string
  ) => {
    const followingIds = followsList
      .filter(f => f.follower_id === userId)
      .map(f => f.following_id);

    let filtered = profilesList.filter(
      p => p.id !== userId && !followingIds.includes(p.id)
    );

    // FALLBACK IF EMPTY
    if (filtered.length === 0) {
      filtered = profilesList.filter(p => p.id !== userId);
    }

    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    setSuggestedUsers(shuffled.slice(0, 5));
  };

  return (
    <div className="flex justify-center min-h-screen bg-black">
      <div className="w-full max-w-[430px] bg-black text-white pb-32">

        {/* HEADER */}
        <div className="sticky top-0 z-30 bg-black/80 backdrop-blur border-b border-white/10">
          <div className="px-6 py-4">
            <h1 className="text-3xl font-black">Explore</h1>
            <p className="text-sm text-gray-500 mt-1">Discover people and posts</p>
          </div>
        </div>

        <div className="px-4 py-4 space-y-6">

          {loading && <p className="text-center text-gray-500 py-12">Loading...</p>}

          {!loading && (
            <>
              {/* PEOPLE */}
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 px-1">Suggested</h2>
                <div className="space-y-2">
                  {suggestedUsers.map((user) => (
                    <button
                      key={user.id}
                      className="w-full flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 active:bg-white/15 transition-colors"
                      onClick={() => router.push(`/profile/${user.id}`)}
                    >
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={`${user.username} avatar`} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex-shrink-0" />
                      )}
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-white flex items-center gap-1">
                          {user.username}
                          {user.verified && <VerificationBadge />}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">@{user.username?.toLowerCase()}</p>
                      </div>
                      <span className="text-sm text-purple-400 font-medium">View →</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* POSTS */}
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 px-1">Trending</h2>
                <div className="space-y-3">
                  {sortedPosts.map((post) => {
                    const user = getProfile(post.user_id);
                    const postComments = comments.filter(c => c.post_id === post.id);
                    const postLikes = likes.filter(l => l.post_id === post.id);

                    return (
                      <div key={post.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                        <button
                          className="font-bold text-base text-white hover:text-purple-400 transition-colors flex items-center gap-1"
                          onClick={() => router.push(`/profile/${post.user_id}`)}
                        >
                          {user?.username}
                          {user?.verified && <VerificationBadge />}
                        </button>

                        {post.content && <p className="text-gray-300 leading-relaxed">{post.content}</p>}

                        {post.media_url && (
                          <img src={post.media_url} alt="Post media" className="w-full rounded-xl border border-white/10" />
                        )}

                        <div className="flex gap-6 pt-2 border-t border-white/10">
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="text-lg">♡</span>
                            <span>{postLikes.length}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="text-lg">💬</span>
                            <span>{postComments.length}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}