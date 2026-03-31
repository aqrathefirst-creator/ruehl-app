'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/preserve-manual-memoization */

import { useEffect, useState, useMemo } from 'react';
import { supabase, uploadPostMedia } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import PageWrapper from '../components/PageWrapper';
import VerificationBadge from '@/components/VerificationBadge';

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  verified?: boolean;
};

type Post = {
  id: string;
  content: string;
  user_id: string;
  media_url?: string | null;
  created_at?: string;

  // ✅ ADD THESE
  track_name?: string | null;
  artist_name?: string | null;
  sound_id?: string | null;
};

type Comment = {
  id: string;
  content: string;
  user_id: string;
  post_id: string;
};

type Like = {
  id: string;
  user_id: string;
  post_id: string;
};

type Lift = {
  id: string;
  user_id: string;
  post_id: string;
};

type Activity = {
  id: string;
  user_id: string;
  target_id: string;
  type: string;
};

type Notification = {
  id: string;
  read: boolean;
};

type Sound = {
  id: string;
  track_name?: string | null;
  artist_name?: string | null;
  thumbnail_url?: string | null;
  bpm?: number | null;
  preview_url?: string | null;
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [lifts, setLifts] = useState<Lift[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [newComments, setNewComments] = useState<{ [key: string]: string }>({});
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(true);
  const [profileSearch, setProfileSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activePowerPost, setActivePowerPost] = useState<Post | null>(null);
  const [trendingTracks, setTrendingTracks] = useState<Sound[]>([]);
  const [upcomingTracks, setUpcomingTracks] = useState<Sound[]>([]);
  const [trackPreviewAudio, setTrackPreviewAudio] = useState<HTMLAudioElement | null>(null);

  const [overlayMode, setOverlayMode] = useState<{ [key: string]: boolean }>({});

  const [newPostContent, setNewPostContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // ✅ NEW (MUSIC STATE)
  const [trackName, setTrackName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [savedSounds, setSavedSounds] = useState<any[]>([]);
const [suggestedSounds, setSuggestedSounds] = useState<any[]>([]);
  

  // animation
  const [animatingPost, setAnimatingPost] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('overlayMode');
    if (saved) setOverlayMode(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('overlayMode', JSON.stringify(overlayMode));
  }, [overlayMode]);

  const track = async (type: string, targetId: string) => {
    if (!currentUser) return;
    await supabase.from('user_activity').insert({
      user_id: currentUser.id,
      target_id: targetId,
      type,
    });
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        localStorage.setItem('user_id', data.user.id);
      }
      const user = data.user;
      setCurrentUser(user);

      if (!user) return;

      const { data: notifData } = await supabase
        .from('notifications')
        .select('id, read')
        .eq('user_id', user.id);

      setNotifications(notifData || []);
    });
  }, []);

  const fetchData = async () => {
    if (!currentUser) return;

    // Run independent queries in parallel and limit result sizes for performance.
    const [
      { data: postsData },
      { data: profilesData },
      { data: commentsData },
      { data: likesData },
      { data: liftsData },
      { data: activityData },
      { data: saved },
      { data: trendingData },
      { data: upcomingData },
    ] = await Promise.all([
      supabase
        .from('posts')
        .select('id, content, user_id, media_url, created_at, track_name, artist_name, sound_id')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('profiles')
        .select('id, username, avatar_url, verified'),
      supabase
        .from('comments')
        .select('id, content, user_id, post_id')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('likes')
        .select('id, user_id, post_id'),
      supabase
        .from('post_lifts')
        .select('id, user_id, post_id'),
      supabase
        .from('user_activity')
        .select('id, user_id, target_id, type')
        .eq('user_id', currentUser.id),
      supabase
        .from('saved_sounds')
        .select('sound_id')
        .eq('user_id', currentUser.id),
      supabase
        .from('sounds')
        .select('id, track_name, artist_name, thumbnail_url, bpm, preview_url')
        .order('usage_count', { ascending: false })
        .limit(10),
      supabase
        .from('sounds')
        .select('id, track_name, artist_name, thumbnail_url, bpm, preview_url')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    setPosts(postsData || []);
    setProfiles(profilesData || []);
    setComments(commentsData || []);
    setLikes(likesData || []);
    setLifts((liftsData as Lift[]) || []);
    setActivities(activityData || []);
    setTrendingTracks((trendingData as Sound[]) || []);
    setUpcomingTracks((upcomingData as Sound[]) || []);

    const ids = saved?.map((s: { sound_id: string }) => s.sound_id) || [];
    if (ids.length > 0) {
      const { data: soundsData } = await supabase
        .from('sounds')
        .select('id, track_name, artist_name, thumbnail_url, bpm, preview_url')
        .in('id', ids);
      setSavedSounds(soundsData || []);
    }
  };

  useEffect(() => {
    if (currentUser) fetchData();
  }, [currentUser]);

  const getProfile = (id: string) => profiles.find(p => p.id === id);
  const getLikes = (postId: string) => likes.filter(l => l.post_id === postId);
  const getLifts = (postId: string) => lifts.filter((l) => l.post_id === postId);
  const getComments = (postId: string) => comments.filter((c) => c.post_id === postId);
  const hasLiked = (postId: string) =>
    likes.some(l => l.post_id === postId && l.user_id === currentUser?.id);
  const hasLifted = (postId: string) =>
    lifts.some((l) => l.post_id === postId && l.user_id === currentUser?.id);

  const moodMap: { [key: string]: string } = {
  gym: 'aggressive',
  workout: 'aggressive',
  run: 'fast',
  cardio: 'fast',
  focus: 'calm',
  study: 'calm',
  relax: 'calm',
  night: 'dark',
  grind: 'aggressive',
  energy: 'fast',
};

const detectMood = (text: string) => {
  const lower = text.toLowerCase();
  for (const key in moodMap) {
    if (lower.includes(key)) return moodMap[key];
  }
  return null;
};

const fetchSuggestedSounds = async (mood: string) => {
  const { data } = await supabase
    .from('sounds')
    .select('*')
    .eq('mood', mood)
    .order('trending_score', { ascending: false })
    .limit(5);

  setSuggestedSounds(data || []);
};


  const getPostScore = (post: Post) => {
    const likeCount = likes.filter(l => l.post_id === post.id).length;
    const commentCount = comments.filter(c => c.post_id === post.id).length;
    const liftCount = lifts.filter((l) => l.post_id === post.id).length;

    let score = likeCount * 2 + commentCount * 3 + liftCount * 5;

    if (post.created_at) {
      const createdMs = new Date(post.created_at).getTime();
      if (Number.isFinite(createdMs)) {
        score += 1;
      }
    }

    return score;
  };

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => getPostScore(b) - getPostScore(a)),
    [posts, likes, comments]
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const filteredProfiles = useMemo(() => {
    const query = profileSearch.trim().toLowerCase();
    const pool = profiles.filter((profile) => profile.id !== currentUser?.id);

    if (!query) return pool.slice(0, 8);

    return pool
      .filter((profile) => profile.username?.toLowerCase().includes(query))
      .slice(0, 8);
  }, [profileSearch, profiles, currentUser]);

  const nowFeedPosts = useMemo(
    () => sortedPosts.filter((post) => !!post.media_url).slice(0, 12),
    [sortedPosts]
  );

  const powerFeedPosts = useMemo(
    () => sortedPosts.filter((post) => !post.media_url && !!post.content?.trim()).slice(0, 12),
    [sortedPosts]
  );

  const isVideoMedia = (url: string) => /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);

  const railClass =
    'flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

  const openTrack = (track: Sound) => {
    if (trackPreviewAudio) {
      trackPreviewAudio.pause();
    }

    if (track.preview_url) {
      const audio = new Audio(track.preview_url);
      audio.volume = 0.45;
      audio.play().catch(() => {});
      setTrackPreviewAudio(audio);
    }

    router.push(`/sound/${track.id}`);
  };

  useEffect(() => {
    return () => {
      if (trackPreviewAudio) {
        trackPreviewAudio.pause();
      }
    };
  }, [trackPreviewAudio]);

  const createPost = async () => {
  if (!currentUser || posting) return;
  if (!newPostContent && !file) return;

  setPosting(true);

  let mediaUrl: string | null = null;

  if (file) {
    mediaUrl = await uploadPostMedia(file, currentUser.id);
  }

  let soundId = null;

  if (trackName) {
    const { data: existing } = await supabase
      .from('sounds')
      .select('*')
      .eq('track_name', trackName)
      .eq('artist_name', artistName)
      .single();

    if (existing) {
      soundId = existing.id;

      await supabase
        .from('sounds')
        .update({
          usage_count: existing.usage_count + 1,
        })
        .eq('id', existing.id);

    } else {
      const { data: newSound } = await supabase
        .from('sounds')
        .insert({
          track_name: trackName,
          artist_name: artistName,
          usage_count: 1,
        })
        .select()
        .single();

      soundId = newSound.id;
    }
  }

  await supabase.from('posts').insert({
    content: newPostContent,
    user_id: currentUser.id,
    media_url: mediaUrl,
    track_name: trackName,
    artist_name: artistName,
    sound_id: soundId,
  });

  setNewPostContent('');
  setFile(null);
  setPreview(null);
  setTrackName('');
  setArtistName('');

  setPosting(false);
  fetchData();
};

  const toggleLike = async (post: Post) => {
    if (!currentUser) return;

    const existing = likes.find(
      l => l.post_id === post.id && l.user_id === currentUser.id
    );

    let likedNow = false;

    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('likes').insert({
        user_id: currentUser.id,
        post_id: post.id,
      });
      likedNow = true;
    }

    if (likedNow) {
      await supabase.rpc('increase_sound_score', {
        post_id_input: post.id,
      });

      await track('like', post.id);
    }

    fetchData();
  };

  const toggleLift = async (post: Post) => {
    if (!currentUser) return;

    const existing = lifts.find(
      (l) => l.post_id === post.id && l.user_id === currentUser.id
    );

    if (existing) {
      await supabase.from('post_lifts').delete().eq('id', existing.id);
    } else {
      await supabase.from('post_lifts').insert({
        user_id: currentUser.id,
        post_id: post.id,
      });
      await track('lift', post.id);
    }

    fetchData();
  };

  const handleDoubleTap = async (post: Post) => {
    if (!hasLiked(post.id)) {
      toggleLike(post);
    }

    setAnimatingPost(post.id);
    setTimeout(() => setAnimatingPost(null), 700);
  };

  const addComment = async (postId: string) => {
    const content = newComments[postId];
    if (!content?.trim() || !currentUser) return;

    await supabase.from('comments').insert({
      content: content.trim(),
      user_id: currentUser.id,
      post_id: postId,
    });

    setNewComments(prev => ({ ...prev, [postId]: '' }));
    fetchData();
  };

  const deletePost = async (postId: string) => {
    await supabase.from('posts').delete().eq('id', postId);
    fetchData();
  };

  const editPost = async (postId: string, content: string) => {
    const newContent = prompt('Edit post:', content);
    if (!newContent) return;

    await supabase.from('posts').update({ content: newContent }).eq('id', postId);
    fetchData();
  };

  const deleteComment = async (commentId: string) => {
    await supabase.from('comments').delete().eq('id', commentId);
    fetchData();
  };

  const editComment = async (commentId: string, content: string) => {
    const newContent = prompt('Edit comment:', content);
    if (!newContent) return;

    await supabase.from('comments').update({ content: newContent }).eq('id', commentId);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="w-full max-w-[430px] mx-auto pb-36">

        {/* ── STICKY HEADER ── */}
        <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-white/[0.06]">
          <div className="relative flex items-center h-14 px-4">
            <span className="text-xl font-black tracking-tight">RUEHL</span>
            <div className="absolute right-4 flex items-center gap-2">
              <button
                onClick={() => setSearchOpen((prev) => !prev)}
                className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center active:scale-90 transition-transform"
                aria-label="Search"
              >
                <span className="text-base">🔍</span>
              </button>
              <button
                onClick={() => router.push('/notifications')}
                className="relative w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center active:scale-90 transition-transform"
                aria-label="Notifications"
              >
                <span className="text-base">❤️</span>
                {unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── SEARCH BAR ── */}
        {searchOpen && (
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 rounded-full bg-[#111] border border-white/[0.08] px-4 py-3">
              <span className="text-gray-500 text-sm">🔍</span>
              <input
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder={searchFocused ? '' : 'Search users or profiles'}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
              />
            </div>
            {(searchFocused || profileSearch.trim().length > 0) && (
              <div className="mt-2 rounded-2xl bg-[#0E0E0E] border border-white/[0.08] overflow-hidden shadow-2xl">
                {filteredProfiles.length > 0 ? (
                  filteredProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => router.push(`/profile/${profile.id}`)}
                      className="w-full px-4 py-3 border-b border-white/[0.06] last:border-0 text-left active:bg-white/[0.08] transition-colors flex items-center gap-3"
                    >
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.username} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-white/10 flex-shrink-0" />
                      )}
                      <span className="text-sm font-semibold text-white">@{profile.username}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">No profiles found.</div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="px-4 pt-6 space-y-8">

          {/* ── NOW FEED ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[18px] font-bold text-white">Now Feed</h2>
              <button
                onClick={() => router.push('/now')}
                className="text-[14px] text-gray-500 active:text-gray-300 transition-colors"
              >
                See all
              </button>
            </div>
            <div className={railClass}>
              {nowFeedPosts.length === 0 && (
                <div className="w-[75%] shrink-0 rounded-[20px] bg-[#0E0E0E] border border-white/[0.06] flex items-center justify-center" style={{ height: 440 }}>
                  <span className="text-gray-600 text-sm">No posts yet</span>
                </div>
              )}
              {nowFeedPosts.map((post) => {
                const user = getProfile(post.user_id);
                const mediaUrl = post.media_url || '';
                const likeCount = getLikes(post.id).length;
                const liked = hasLiked(post.id);
                return (
                  <button
                    key={post.id}
                    onClick={() => router.push('/now')}
                    className="relative w-[75%] shrink-0 snap-center rounded-[20px] overflow-hidden border border-white/[0.06] bg-[#0E0E0E] active:scale-[0.97] transition-transform"
                    style={{ height: 440 }}
                  >
                    <div className="absolute inset-0">
                      {isVideoMedia(mediaUrl) ? (
                        <video src={mediaUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                      ) : (
                        <img src={mediaUrl} className="w-full h-full object-cover" alt="" />
                      )}
                    </div>
                    {/* Bottom fade gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                    {/* Top-left: username */}
                    <div className="absolute top-4 left-4 flex items-center gap-1.5">
                      <span className="text-[14px] font-bold text-white drop-shadow-sm">@{user?.username || 'user'}</span>
                      {user?.verified && <VerificationBadge />}
                    </div>
                    {/* Bottom: caption + like count */}
                    <div className="absolute bottom-4 left-4 right-4 text-left">
                      {post.content && (
                        <p className="text-[13px] text-white/90 font-medium truncate mb-1.5">{post.content}</p>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm ${liked ? 'text-red-400' : 'text-white/50'}`}>{liked ? '♥' : '♡'}</span>
                        <span className="text-xs text-white/50">{likeCount}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── POWER THOUGHTS ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[18px] font-bold text-white">Power Thoughts</h2>
              <span className="text-[14px] text-gray-500">Trending</span>
            </div>
            <div className={railClass}>
              {powerFeedPosts.length === 0 && (
                <div className="w-[260px] shrink-0 rounded-2xl bg-[#111] border border-white/[0.06] flex items-center justify-center" style={{ height: 130 }}>
                  <span className="text-gray-600 text-sm">No thoughts yet</span>
                </div>
              )}
              {powerFeedPosts.map((post) => {
                const user = getProfile(post.user_id);
                const heat = getLikes(post.id).length;
                return (
                  <button
                    key={post.id}
                    onClick={() => setActivePowerPost(post)}
                    className="w-[260px] shrink-0 snap-start rounded-2xl border border-white/[0.06] bg-[#111] p-3 text-left active:scale-[0.97] transition-transform flex flex-col justify-between"
                    style={{ height: 130 }}
                  >
                    <p className="text-[15px] font-semibold text-white leading-snug line-clamp-2">{post.content}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-gray-500">@{user?.username || 'user'}</span>
                      <div className="flex items-center gap-1 text-[12px] text-orange-400">
                        <span>🔥</span>
                        <span>{heat}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── MUSIC ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[18px] font-bold text-white">Music</h2>
              <button
                onClick={() => router.push('/saved-sounds')}
                className="text-[14px] text-gray-500 active:text-gray-300 transition-colors"
              >
                See all
              </button>
            </div>

            {/* A. Featured track */}
            {trendingTracks[0] && (
              <button
                onClick={() => openTrack(trendingTracks[0])}
                className="w-full rounded-[20px] overflow-hidden border border-white/[0.06] relative mb-3 active:scale-[0.98] transition-transform"
                style={{ height: 160 }}
              >
                <div className="absolute inset-0">
                  {trendingTracks[0].thumbnail_url ? (
                    <img src={trendingTracks[0].thumbnail_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-pink-500" />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/20 pointer-events-none" />
                <div className="absolute inset-0 p-5 flex flex-col justify-end text-left">
                  <div className="text-[10px] font-bold tracking-[0.2em] text-[#39FF14] uppercase mb-1">Trending</div>
                  <div className="text-[18px] font-bold text-white leading-tight">{trendingTracks[0].track_name || 'Unknown Track'}</div>
                  <div className="text-[14px] text-gray-400 mt-0.5">{trendingTracks[0].artist_name || 'Unknown Artist'}</div>
                  {trendingTracks[0].bpm && (
                    <div className="mt-2 inline-flex w-fit items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] text-white/60">{trendingTracks[0].bpm} BPM</div>
                  )}
                </div>
                {/* Play button */}
                <div className="absolute right-4 bottom-4 w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <span className="text-white text-sm ml-0.5">▶</span>
                </div>
              </button>
            )}

            {/* B. Horizontal track row — 80×80 covers */}
            <div className={railClass}>
              {[...trendingTracks.slice(1, 5), ...upcomingTracks.slice(0, 5)].map((track) => (
                <button
                  key={track.id}
                  onClick={() => openTrack(track)}
                  className="shrink-0 snap-start flex flex-col active:scale-[0.95] transition-transform"
                  style={{ width: 80 }}
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#111] border border-white/[0.06]">
                    {track.thumbnail_url ? (
                      <img src={track.thumbnail_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900" />
                    )}
                  </div>
                  <div className="mt-2 w-20">
                    <div className="text-[12px] font-semibold text-white truncate">{track.track_name || 'Untitled'}</div>
                    <div className="text-[10px] text-gray-500 truncate">{track.artist_name || 'Unknown'}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* ── TRAIN ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[18px] font-bold text-white">Train</h2>
              <button
                onClick={() => router.push('/train')}
                className="text-[14px] text-gray-500 active:text-gray-300 transition-colors"
              >
                See all
              </button>
            </div>
            <button
              onClick={() => router.push('/train')}
              className="w-full rounded-[24px] overflow-hidden border border-white/[0.06] relative text-left active:scale-[0.97] transition-transform"
              style={{ height: 220 }}
            >
              {/* Background layers */}
              <div className="absolute inset-0 bg-[#070f07]" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#39FF14]/[0.12] via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
              <div className="relative p-5 h-full flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#39FF14] uppercase">Fitness</span>
                  <h3 className="text-[22px] font-black text-white mt-1 leading-tight">Build Your Edge</h3>
                  <p className="text-[13px] text-gray-400 mt-1.5">Trending athletes, workouts & drills.</p>
                </div>
                <div className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-[#39FF14] text-black text-[14px] font-bold self-start">
                  Start
                </div>
              </div>
            </button>
          </section>

          {/* ── NUTRITION ── */}
          <section className="pb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[18px] font-bold text-white">Nutrition</h2>
              <button
                onClick={() => router.push('/nutrition')}
                className="text-[14px] text-gray-500 active:text-gray-300 transition-colors"
              >
                See all
              </button>
            </div>
            <button
              onClick={() => router.push('/nutrition')}
              className="w-full rounded-[24px] overflow-hidden border border-white/[0.06] relative text-left active:scale-[0.97] transition-transform"
              style={{ height: 220 }}
            >
              {/* Background layers */}
              <div className="absolute inset-0 bg-[#0f0c00]" />
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.12] via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
              <div className="relative p-5 h-full flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-amber-400 uppercase">Fuel</span>
                  <h3 className="text-[22px] font-black text-white mt-1 leading-tight">Eat with Purpose</h3>
                  <p className="text-[13px] text-gray-400 mt-1.5">Meal plans for your goal.</p>
                </div>
                <div className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-amber-400 text-black text-[14px] font-bold self-start">
                  Explore
                </div>
              </div>
            </button>
          </section>

        </div>
      </div>

      {/* ── POWER POST MODAL ── */}
      {activePowerPost && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setActivePowerPost(null)}
        >
          <div
            className="w-full max-w-[400px] max-h-[85dvh] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-white/[0.08]">
              <div className="flex items-start justify-between gap-3 mb-4">
                <button
                  onClick={() => router.push(`/profile/${activePowerPost.user_id}`)}
                  className="text-[14px] font-semibold text-white active:text-purple-300 transition-colors"
                >
                  @{getProfile(activePowerPost.user_id)?.username || 'user'}
                </button>
                <button
                  onClick={() => setActivePowerPost(null)}
                  className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center text-lg active:scale-90 transition-transform"
                >
                  ×
                </button>
              </div>

              <p className="text-white text-[16px] leading-relaxed">{activePowerPost.content}</p>

              <div className="mt-5 flex items-center gap-2">
                <button
                  onClick={() => toggleLike(activePowerPost)}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[14px] text-white active:scale-95 transition-transform"
                >
                  <span className={hasLiked(activePowerPost.id) ? 'text-red-400' : ''}>{hasLiked(activePowerPost.id) ? '♥' : '♡'}</span>
                  {getLikes(activePowerPost.id).length}
                </button>

                <button
                  onClick={() => toggleLift(activePowerPost)}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[14px] text-white active:scale-95 transition-transform"
                >
                  <span className={hasLifted(activePowerPost.id) ? 'text-cyan-300' : ''}>↻</span>
                  {getLifts(activePowerPost.id).length}
                </button>

                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[14px] text-white">
                  <span>💬</span>
                  {getComments(activePowerPost.id).length}
                </div>
              </div>
            </div>

            <div className="max-h-[38dvh] overflow-y-auto p-4 space-y-3">
              {getComments(activePowerPost.id).map((comment) => (
                <div key={comment.id} className="rounded-xl bg-white/[0.05] border border-white/[0.08] p-3">
                  <div className="text-[12px] text-gray-400">@{getProfile(comment.user_id)?.username || 'user'}</div>
                  <div className="text-[14px] text-white mt-1">{comment.content}</div>
                </div>
              ))}
              {getComments(activePowerPost.id).length === 0 && (
                <div className="text-[13px] text-gray-500 text-center py-4">No comments yet.</div>
              )}
            </div>

            <div className="p-4 border-t border-white/[0.08] flex items-center gap-2">
              <input
                value={newComments[activePowerPost.id] || ''}
                onChange={(e) =>
                  setNewComments((prev) => ({
                    ...prev,
                    [activePowerPost.id]: e.target.value,
                  }))
                }
                placeholder="Add a comment..."
                className="flex-1 h-11 rounded-xl bg-white/10 border border-white/20 px-3 text-sm text-white placeholder:text-gray-500 outline-none"
              />
              <button
                onClick={() => addComment(activePowerPost.id)}
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