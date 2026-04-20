'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/purity */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import VerificationBadge from '@/components/VerificationBadge';

type Post = {
  id: string;
  content: string;
  user_id: string;
  genre?: string | null;
  hashtags?: string[] | null;
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

type Sound = {
  id: string;
  track_name?: string | null;
  artist_name?: string | null;
  cover_url?: string | null;
  category?: string | null;
};

export default function ExplorePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [genreOptions, setGenreOptions] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [suggestedUsers, setSuggestedUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  const init = useCallback(async () => {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    setCurrentUser(user);

    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .order('id', { ascending: false });

    const { data: profilesData } = await supabase.from('profiles').select('*');
    const { data: commentsData } = await supabase.from('comments').select('*');
    const { data: likesData } = await supabase.from('likes').select('*');
    const { data: followsData } = await supabase.from('follows').select('*');
    const { data: soundsData } = await supabase.from('licensed_tracks').select('*').order('id', { ascending: false }).limit(300);
    const { data: adminGenresData } = await supabase
      .from('admin_genres')
      .select('name')
      .limit(100);

    const visibleProfiles = ((profilesData || []) as Profile[]).filter((item) => !item.shadow_banned);
    const visibleProfileIds = new Set(visibleProfiles.map((item) => item.id));
    const visiblePosts = ((postsData || []) as Post[]).filter(
      (item) => visibleProfileIds.has(item.user_id) && item.hidden_by_admin !== true && item.discovery_disabled !== true
    );

    setPosts(visiblePosts);
    setProfiles(visibleProfiles);
    setComments(commentsData || []);
    setLikes(likesData || []);
    const mappedSounds: Sound[] = (soundsData || []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id ?? ''),
        track_name: String(row.title ?? row.name ?? row.track_title ?? '') || null,
        artist_name: String(row.artist ?? row.artist_name ?? '') || null,
        cover_url: (row.cover_url as string | null | undefined) || null,
        category: (row.category as string | null | undefined) ?? null,
      };
    });
    setSounds(mappedSounds);
    setGenreOptions((((adminGenresData || []) as { name?: string | null }[]).map((item) => item.name || '').filter(Boolean)) as string[]);
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

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const userResults = useMemo(() => {
    if (!normalizedQuery) return [];

    return profiles
      .filter((item) => item.id !== currentUser?.id)
      .filter((item) => item.username?.toLowerCase().includes(normalizedQuery))
      .slice(0, 8);
  }, [profiles, currentUser, normalizedQuery]);

  const musicResults = useMemo(() => {
    if (!normalizedQuery) return [];

    return sounds
      .filter((item) => {
        const track = item.track_name?.toLowerCase() || '';
        const artist = item.artist_name?.toLowerCase() || '';
        return track.includes(normalizedQuery) || artist.includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [sounds, normalizedQuery]);

  const genreResults = useMemo(() => {
    if (!normalizedQuery) return [];

    const fromPosts = posts.map((item) => item.genre || '').filter(Boolean);
    const fromSounds = sounds.map((item) => item.category || '').filter(Boolean);
    const merged = [...genreOptions, ...fromPosts, ...fromSounds];
    const unique = Array.from(new Set(merged.map((item) => item.trim()).filter(Boolean)));

    return unique.filter((item) => item.toLowerCase().includes(normalizedQuery)).slice(0, 10);
  }, [posts, sounds, genreOptions, normalizedQuery]);

  const hashtagResults = useMemo(() => {
    if (!normalizedQuery) return [];

    const counts = new Map<string, number>();

    for (const post of posts) {
      const inlineTags = (post.content || '').match(/#[a-zA-Z0-9_]+/g) || [];
      const listTags = (post.hashtags || []).map((item) => `#${String(item).replace(/^#/, '')}`);
      const tags = [...inlineTags, ...listTags];

      for (const tag of tags) {
        const normalizedTag = tag.toLowerCase();
        counts.set(normalizedTag, (counts.get(normalizedTag) || 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .filter(([tag]) => tag.includes(normalizedQuery.startsWith('#') ? normalizedQuery : `#${normalizedQuery}`) || tag.includes(normalizedQuery))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
  }, [posts, normalizedQuery]);

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
            <div className="mt-3">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search users, music, genres, hashtags"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-6">

          {loading && <p className="text-center text-gray-500 py-12">Loading...</p>}

          {!loading && (
            <>
              {normalizedQuery && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 px-1">Users</h2>
                    {userResults.length === 0 && <p className="text-sm text-gray-600 px-1">No users found</p>}
                    <div className="space-y-2">
                      {userResults.map((item) => (
                        <button
                          key={item.id}
                          className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                          onClick={() => router.push(`/profile/${item.id}`)}
                        >
                          {item.avatar_url ? (
                            <img src={item.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-white/10" />
                          )}
                          <div className="text-left">
                            <div className="text-sm font-semibold text-white inline-flex items-center gap-1">
                              {item.username}
                              {item.verified && <VerificationBadge />}
                            </div>
                            <div className="text-xs text-gray-500">@{item.username?.toLowerCase()}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 px-1">Music</h2>
                    {musicResults.length === 0 && <p className="text-sm text-gray-600 px-1">No music found</p>}
                    <div className="space-y-2">
                      {musicResults.map((item) => (
                        <button
                          key={item.id}
                          className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
                          onClick={() => router.push(`/sound/${item.id}`)}
                        >
                          {item.cover_url && <img src={item.cover_url} alt="" className="w-10 h-10 rounded-md object-cover" />}
                          <div className="text-left min-w-0">
                            <div className="truncate text-sm font-semibold text-white">{item.track_name || ''}</div>
                            <div className="truncate text-xs text-gray-500">{item.artist_name || ''}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 px-1">Genres</h2>
                    {genreResults.length === 0 && <p className="text-sm text-gray-600 px-1">No genres found</p>}
                    <div className="flex flex-wrap gap-2">
                      {genreResults.map((genre) => (
                        <button
                          key={genre}
                          onClick={() => setSearchQuery(genre)}
                          className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/85"
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 px-1">Hashtags</h2>
                    {hashtagResults.length === 0 && <p className="text-sm text-gray-600 px-1">No hashtags found</p>}
                    <div className="space-y-1">
                      {hashtagResults.map((item) => (
                        <button
                          key={item.tag}
                          onClick={() => setSearchQuery(item.tag)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white/85"
                        >
                          <span>{item.tag}</span>
                          <span className="ml-2 text-xs text-gray-500">{item.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!normalizedQuery && (
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
            </>
          )}

        </div>
      </div>
    </div>
  );
}