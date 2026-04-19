'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import VerificationBadge from '@/components/VerificationBadge';
import { playPreviewAudio } from '@/lib/previewAudio';

type Profile = {
  id: string;
  username: string;
  avatar_url?: string | null;
  is_verified?: boolean;
  verified?: boolean;
  activity_type?: string | null;
  shadow_banned?: boolean;
};

type Post = {
  id: string;
  content: string;
  user_id: string;
  media_url?: string | null;
  created_at?: string;
  likes_count?: number | null;
  comments_count?: number | null;
  genre?: string | null;
  mood?: string | null;
  activity?: string | null;
  alignment_score?: number | null;
  sound_adaptive_weight?: number | null;
  track_name?: string | null;
  artist_name?: string | null;
  sound_id?: string | null;
  sound_cover_url?: string | null;
  sound_preview_url?: string | null;
  hidden_by_admin?: boolean;
  discovery_disabled?: boolean;
  sounds?: { total_posts?: number | null; unique_users?: number | null; adaptive_weight?: number | null } | Array<{ total_posts?: number | null; unique_users?: number | null; adaptive_weight?: number | null }> | null;
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

type ChartRow = {
  sound_id: string | null;
  rank: number | null;
};

type StoryPost = {
  id: string;
  user_id: string;
  media_url: string;
  created_at: string;
  content: string;
};

type StoryUser = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  verified: boolean;
  latestAt: string;
  stories: StoryPost[];
};

type StoryEntry = {
  id: string;
  user_id: string;
  media_url: string;
  content: string;
  created_at: string;
  expires_at: string;
};

type StoryView = {
  story_id: string;
  viewed_at: string;
};

const isVideoMedia = (url: string) => /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);

const canHoverPreview = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
};

export default function NowFeedPage() {
  const { user, profile } = useUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [lifts, setLifts] = useState<Lift[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [chartRankBySoundId, setChartRankBySoundId] = useState<Record<string, number>>({});
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([]);
  const [storyEntries, setStoryEntries] = useState<StoryEntry[]>([]);
  const [viewedStoryIds, setViewedStoryIds] = useState<string[]>([]);
  const [activeStoryUserId, setActiveStoryUserId] = useState<string | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);

  const [activeCommentsPost, setActiveCommentsPost] = useState<string | null>(null);
  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  const [activeVideoOverlayPostId, setActiveVideoOverlayPostId] = useState<string | null>(null);
  const [pausedVideoPostIds, setPausedVideoPostIds] = useState<Record<string, boolean>>({});
  const [mutedVideoPostIds, setMutedVideoPostIds] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  const withAuthFetchJson = useCallback(async <T,>(url: string, options: RequestInit): Promise<T> => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error('Missing auth session');

    const headers = new Headers(options.headers);
    if (!headers.has('content-type') && options.body) headers.set('content-type', 'application/json');
    headers.set('authorization', `Bearer ${token}`);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const json = await response.json().catch(() => null);
      throw new Error((json as { error?: string } | null)?.error || 'Request failed');
    }

    const json = await response.json().catch(() => null);
    return (json as T) || ({} as T);
  }, []);

  const withAuthFetch = useCallback(async (url: string, options: RequestInit) => {
    await withAuthFetchJson(url, options);
  }, [withAuthFetchJson]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    const [
      { data: postsData },
      { data: profilesData },
      { data: likesData },
      { data: commentsData },
      { data: liftsData },
      { data: followingData },
      { data: savedPostsData },
      { data: chartRows },
      storiesPayload,
      storyViewsPayload,
    ] = await Promise.all([
      (async () => {
        const primary = await supabase
          .from('posts')
          .select(`
            id,
            content,
            media_url,
            created_at,
            likes_count,
            comments_count,
            sound_id,
            genre,
            mood,
            activity,
            alignment_score,
            user_id,
            track_name,
            artist_name,
            hidden_by_admin,
            discovery_disabled,
            sounds (
              total_posts,
              unique_users,
              adaptive_weight
            )
          `)
          .order('created_at', { ascending: false })
          .limit(240);

        if (!primary.error) return primary;

        const missingSignalCols = /total_posts|unique_users|adaptive_weight|likes_count|comments_count|mood|activity|alignment_score/i.test(primary.error.message || '');
        if (!missingSignalCols) return primary;

        return supabase
          .from('posts')
          .select(`
            id,
            content,
            media_url,
            created_at,
            sound_id,
            genre,
            mood,
            activity,
            alignment_score,
            user_id,
            track_name,
            artist_name,
            hidden_by_admin,
            discovery_disabled
          `)
          .order('created_at', { ascending: false })
          .limit(240);
      })(),
      supabase.from('profiles').select('*'),
      supabase.from('likes').select('*'),
      supabase.from('comments').select('*'),
      supabase.from('post_lifts').select('*'),
      supabase.from('follows').select('following_id').eq('follower_id', user.id),
      supabase.from('saved_posts').select('post_id').eq('user_id', user.id),
      supabase.from('chart_scores').select('sound_id, rank').not('sound_id', 'is', null),
      withAuthFetchJson<{ items: StoryEntry[] }>('/api/stories', { method: 'GET' }).catch(() => null),
      withAuthFetchJson<{ items: StoryView[] }>('/api/stories/views', { method: 'GET' }).catch(() => null),
    ]);

    const nextPosts = ((postsData || []) as Post[]);
    const nextProfiles = ((profilesData || []) as Profile[]);
    const nextLikes = ((likesData || []) as Like[]);
    const nextComments = ((commentsData || []) as Comment[]);
    const nextLifts = ((liftsData || []) as Lift[]);
    const nextFollowingIds = ((followingData || []) as { following_id: string }[]).map((item) => item.following_id);
    const nextSavedPostIds = ((savedPostsData || []) as { post_id: string | null }[])
      .map((item) => item.post_id)
      .filter((item): item is string => Boolean(item));

    const chartMap = (((chartRows as unknown) as ChartRow[] | null) || []).reduce<Record<string, number>>((acc, row) => {
      if (!row.sound_id || typeof row.rank !== 'number') return acc;
      if (row.rank < 1 || row.rank > 20) return acc;
      const existing = acc[row.sound_id];
      if (!existing || row.rank < existing) acc[row.sound_id] = row.rank;
      return acc;
    }, {});

    const profileById = new Map(nextProfiles.map((item) => [item.id, item]));
    const ownId = user.id;

    const visiblePosts = nextPosts.filter((post) => {
      if (post.hidden_by_admin || post.discovery_disabled) return false;
      if (post.user_id === ownId) return true;
      return !profileById.get(post.user_id)?.shadow_banned;
    });

    const likeCountByPost = nextLikes.reduce<Record<string, number>>((acc, item) => {
      acc[item.post_id] = (acc[item.post_id] || 0) + 1;
      return acc;
    }, {});
    const commentCountByPost = nextComments.reduce<Record<string, number>>((acc, item) => {
      acc[item.post_id] = (acc[item.post_id] || 0) + 1;
      return acc;
    }, {});

    const fallbackSoundSignals = visiblePosts.reduce<Record<string, { total_posts: number; unique_users: number }>>((acc, post) => {
      if (!post.sound_id) return acc;
      if (!acc[post.sound_id]) {
        acc[post.sound_id] = { total_posts: 0, unique_users: 0 };
      }
      acc[post.sound_id].total_posts += 1;
      return acc;
    }, {});

    const usersBySound = visiblePosts.reduce<Record<string, Set<string>>>((acc, post) => {
      if (!post.sound_id) return acc;
      if (!acc[post.sound_id]) {
        acc[post.sound_id] = new Set<string>();
      }
      if (post.user_id) acc[post.sound_id].add(post.user_id);
      return acc;
    }, {});

    Object.entries(usersBySound).forEach(([soundId, ids]) => {
      if (!fallbackSoundSignals[soundId]) {
        fallbackSoundSignals[soundId] = { total_posts: 0, unique_users: 0 };
      }
      fallbackSoundSignals[soundId].unique_users = ids.size;
    });

    const getSoundSignal = (post: Post) => {
      if (!post.sounds) {
        return {
          ...(post.sound_id ? (fallbackSoundSignals[post.sound_id] || { total_posts: 0, unique_users: 0 }) : { total_posts: 0, unique_users: 0 }),
          adaptive_weight: 1,
        };
      }
      if (Array.isArray(post.sounds)) {
        const first = post.sounds[0];
        if (!first && post.sound_id) {
          return {
            ...(fallbackSoundSignals[post.sound_id] || { total_posts: 0, unique_users: 0 }),
            adaptive_weight: 1,
          };
        }
        return {
          total_posts: first?.total_posts || 0,
          unique_users: first?.unique_users || 0,
          adaptive_weight: first?.adaptive_weight || 1,
        };
      }
      return {
        total_posts: post.sounds.total_posts || 0,
        unique_users: post.sounds.unique_users || 0,
        adaptive_weight: post.sounds.adaptive_weight || 1,
      };
    };

    const rankedPosts = visiblePosts.map((post) => {
      const likesCount = post.likes_count ?? likeCountByPost[post.id] ?? 0;
      const commentsCount = post.comments_count ?? commentCountByPost[post.id] ?? 0;
      const engagement =
        likesCount * 2 +
        commentsCount * 3;

      const recency = Date.now() - new Date(post.created_at || 0).getTime();
      const soundSignal = getSoundSignal(post);
      const soundBoost = (soundSignal.total_posts || 0) * 0.5;
      const genreBoost = post.genre ? 100 : 0;
      const alignmentBoost = (post.alignment_score || 0) * (soundSignal.adaptive_weight || 1);

      return {
        ...post,
        isFollowing: nextFollowingIds.includes(post.user_id),
        score:
          engagement +
          soundBoost +
          genreBoost +
          alignmentBoost -
          recency * 0.000001,
      };
    });

    rankedPosts.sort((a, b) => b.score - a.score);

    const following = rankedPosts.filter((post) => post.isFollowing);
    const suggested = rankedPosts.filter((post) => !post.isFollowing);
    const followingCap = Math.ceil(rankedPosts.length * 0.7);
    const suggestedCap = Math.ceil(rankedPosts.length * 0.3);

    const mixedFeed = [
      ...following.slice(0, followingCap),
      ...suggested.slice(0, suggestedCap),
    ];

    const seen = new Set(mixedFeed.map((post) => post.id));
    const backfill = rankedPosts.filter((post) => !seen.has(post.id));
    const scored = [...mixedFeed, ...backfill];

    const soundIds = [...new Set(scored.map((item) => item.sound_id).filter((id): id is string => Boolean(id)))];
    let coverBySoundId = new Map<string, { cover_url: string | null; preview_url: string | null; adaptive_weight: number }>();

    if (soundIds.length > 0) {
      const { data: soundRows } = await supabase
        .from('sounds')
        .select('id, cover_url, thumbnail_url, preview_url, adaptive_weight')
        .in('id', soundIds);

      coverBySoundId = new Map(
        (soundRows || []).map((item) => [
          item.id,
          {
            cover_url: item.cover_url || item.thumbnail_url || null,
            preview_url: item.preview_url || null,
            adaptive_weight: item.adaptive_weight || 1,
          },
        ])
      );
    }

    setPosts(
      scored.map((item) => ({
        ...item,
        sound_cover_url: item.sound_id ? (coverBySoundId.get(item.sound_id)?.cover_url ?? null) : null,
        sound_preview_url: item.sound_id ? (coverBySoundId.get(item.sound_id)?.preview_url ?? null) : null,
        sound_adaptive_weight: item.sound_id ? (coverBySoundId.get(item.sound_id)?.adaptive_weight ?? 1) : 1,
      }))
    );
    setProfiles(nextProfiles);
    setLikes(nextLikes);
    setComments(nextComments);
    setLifts(nextLifts);
    setFollowingIds(nextFollowingIds);
    setSavedPostIds(nextSavedPostIds);
    setChartRankBySoundId(chartMap);
    setStoryEntries((storiesPayload?.items || []).filter((item) => item.media_url && item.expires_at));
    setViewedStoryIds((storyViewsPayload?.items || []).map((item) => item.story_id));
    setLoading(false);
  }, [user, withAuthFetchJson]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('now-feed-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => void fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => void fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_lifts' }, () => void fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchData]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('posts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          const incoming = payload.new as Post;
          if (!incoming?.id) return;

          setPosts((prev) => {
            if (prev.some((post) => post.id === incoming.id)) return prev;
            return [incoming, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          const incoming = payload.new as Post;
          if (!incoming?.id) return;

          setPosts((prev) => prev.map((post) => (post.id === incoming.id ? { ...post, ...incoming } : post)));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          const deleted = payload.old as Pick<Post, 'id'>;
          if (!deleted?.id) return;

          setPosts((prev) => prev.filter((post) => post.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getProfile = useCallback((id: string) => {
    if (id === profile?.id) return profile;
    return profiles.find((item) => item.id === id);
  }, [profile, profiles]);

  const getLikes = (postId: string) => likes.filter((item) => item.post_id === postId);
  const getComments = (postId: string) => comments.filter((item) => item.post_id === postId);
  const getLifts = (postId: string) => lifts.filter((item) => item.post_id === postId);

  const hasLiked = (postId: string) => likes.some((item) => item.post_id === postId && item.user_id === user?.id);
  const hasLifted = (postId: string) => lifts.some((item) => item.post_id === postId && item.user_id === user?.id);
  const isSaved = (postId: string) => savedPostIds.includes(postId);

  const isProfileVerified = (userProfile?: Profile | null) => Boolean(userProfile?.is_verified ?? userProfile?.verified);

  const storyUsers = useMemo<StoryUser[]>(() => {
    const activeStories = storyEntries.filter((item) => {
      const expiresMs = new Date(item.expires_at).getTime();
      return Number.isFinite(expiresMs) && expiresMs > nowMs;
    });

    const byUser = activeStories.reduce<Record<string, StoryPost[]>>((acc, item) => {
      if (!acc[item.user_id]) acc[item.user_id] = [];
      acc[item.user_id].push({
        id: item.id,
        user_id: item.user_id,
        media_url: item.media_url,
        created_at: item.created_at,
        content: item.content || '',
      });
      return acc;
    }, {});

    const list = Object.entries(byUser)
      .map(([userId, userStories]) => {
        const sorted = [...userStories].sort((a, b) => {
          const aTs = new Date(a.created_at || 0).getTime();
          const bTs = new Date(b.created_at || 0).getTime();
          return aTs - bTs;
        });

        const latest = sorted[sorted.length - 1]?.created_at || '';
        const userProfile = getProfile(userId);

        return {
          userId,
          username: userProfile?.username || 'user',
          avatarUrl: userProfile?.avatar_url || null,
          verified: isProfileVerified(userProfile),
          latestAt: latest,
          stories: sorted,
        };
      })
      .sort((a, b) => new Date(b.latestAt || 0).getTime() - new Date(a.latestAt || 0).getTime());

    return list;
  }, [storyEntries, getProfile, nowMs]);

  const activeStoryUser = useMemo(
    () => storyUsers.find((item) => item.userId === activeStoryUserId) || null,
    [storyUsers, activeStoryUserId]
  );

  const activeStory = activeStoryUser?.stories?.[activeStoryIndex] || null;

  const formatTimestamp = (createdAt?: string) => {
    if (!createdAt) return '';
    const diffMs = nowMs - new Date(createdAt).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const markStoryViewed = useCallback(async (storyId: string) => {
    if (!storyId) return;

    setViewedStoryIds((prev) => (prev.includes(storyId) ? prev : [...prev, storyId]));

    await withAuthFetch('/api/stories/views', {
      method: 'POST',
      body: JSON.stringify({ story_id: storyId }),
    });
  }, [withAuthFetch]);

  const openStoryViewer = (storyUserId: string) => {
    setActiveStoryUserId(storyUserId);
    setActiveStoryIndex(0);
    const firstStory = storyUsers.find((item) => item.userId === storyUserId)?.stories?.[0];
    if (firstStory) {
      void markStoryViewed(firstStory.id);
    }
  };

  const closeStoryViewer = () => {
    setActiveStoryUserId(null);
    setActiveStoryIndex(0);
  };

  const nextStory = useCallback(() => {
    if (!activeStoryUser) return;

    if (activeStoryIndex < activeStoryUser.stories.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
      return;
    }

    const currentUserIdx = storyUsers.findIndex((item) => item.userId === activeStoryUser.userId);
    const nextUser = storyUsers[currentUserIdx + 1];

    if (!nextUser) {
      closeStoryViewer();
      return;
    }

    setActiveStoryUserId(nextUser.userId);
    setActiveStoryIndex(0);
    if (nextUser.stories[0]) {
      void markStoryViewed(nextUser.stories[0].id);
    }
  }, [activeStoryIndex, activeStoryUser, storyUsers, markStoryViewed]);

  const prevStory = () => {
    if (!activeStoryUser) return;

    if (activeStoryIndex > 0) {
      setActiveStoryIndex((prev) => prev - 1);
      return;
    }

    const currentUserIdx = storyUsers.findIndex((item) => item.userId === activeStoryUser.userId);
    const prevUser = storyUsers[currentUserIdx - 1];

    if (!prevUser) return;

    setActiveStoryUserId(prevUser.userId);
    setActiveStoryIndex(Math.max(0, prevUser.stories.length - 1));
    const targetStory = prevUser.stories[Math.max(0, prevUser.stories.length - 1)];
    if (targetStory) {
      void markStoryViewed(targetStory.id);
    }
  };

  useEffect(() => {
    if (!activeStory?.id) return;
    void markStoryViewed(activeStory.id);
  }, [activeStory?.id, markStoryViewed]);

  useEffect(() => {
    if (!activeStory) return;
    if (isVideoMedia(activeStory.media_url)) return;

    const timer = window.setTimeout(() => {
      nextStory();
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [activeStory, nextStory]);

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const existing = likes.find((item) => item.post_id === postId && item.user_id === user.id);

    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('likes').insert({ user_id: user.id, post_id: postId });
    }

    void fetchData();
  };

  const toggleLift = async (postId: string) => {
    if (!user) return;
    const existing = lifts.find((item) => item.post_id === postId && item.user_id === user.id);

    if (existing) {
      await supabase.from('post_lifts').delete().eq('id', existing.id);
    } else {
      await supabase.from('post_lifts').insert({ user_id: user.id, post_id: postId });
    }

    void fetchData();
  };

  const addComment = async (postId: string) => {
    if (!user || !newComment.trim()) return;

    await supabase.from('comments').insert({
      content: newComment.trim(),
      user_id: user.id,
      post_id: postId,
    });

    setNewComment('');
    setActiveCommentsPost(null);
    void fetchData();
  };

  const toggleSavePost = async (postId: string) => {
    if (!user) return;

    if (savedPostIds.includes(postId)) {
      await supabase.from('saved_posts').delete().eq('user_id', user.id).eq('post_id', postId);
    } else {
      await supabase.from('saved_posts').insert({ user_id: user.id, post_id: postId });
    }

    void fetchData();
  };

  const hidePost = (postId: string) => {
    setHiddenPostIds((prev) => (prev.includes(postId) ? prev : [...prev, postId]));
    if (menuPostId === postId) setMenuPostId(null);
  };

  const editPost = async (postId: string, currentContent: string) => {
    if (!user) return;
    const nextContent = window.prompt('Edit post', currentContent || '');
    if (nextContent === null) return;

    await supabase
      .from('posts')
      .update({ content: nextContent.trim() })
      .eq('id', postId)
      .eq('user_id', user.id);

    setMenuPostId(null);
    void fetchData();
  };

  const deletePost = async (postId: string) => {
    if (!user) return;
    const confirmDelete = window.confirm('Delete this post?');
    if (!confirmDelete) return;

    await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id);
    setMenuPostId(null);
    void fetchData();
  };

  const reportPost = async (postId: string) => {
    const reason = window.prompt('Report reason (min 5 chars)');
    if (!reason || reason.trim().length < 5) return;

    await withAuthFetch('/api/reports', {
      method: 'POST',
      body: JSON.stringify({ target_post_id: postId, reason: reason.trim() }),
    });

    setMenuPostId(null);
  };

  const blockUser = async (targetUserId: string) => {
    if (!user || targetUserId === user.id) return;

    await withAuthFetch('/api/blocks', {
      method: 'POST',
      body: JSON.stringify({ blocked_id: targetUserId }),
    });

    setHiddenPostIds((prev) => [...prev, ...posts.filter((post) => post.user_id === targetUserId).map((post) => post.id)]);
    setMenuPostId(null);
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!user || !followingIds.includes(targetUserId)) return;

    await withAuthFetch(`/api/follows?following_id=${encodeURIComponent(targetUserId)}`, {
      method: 'DELETE',
    });

    setFollowingIds((prev) => prev.filter((id) => id !== targetUserId));
    setMenuPostId(null);
  };

  const emptyState = !loading && posts.length === 0;

  const toggleVideoPlayback = async (postId: string) => {
    const videoEl = videoRefs.current[postId];
    if (!videoEl) return;

    if (videoEl.paused) {
      await videoEl.play().catch(() => undefined);
      setPausedVideoPostIds((prev) => ({ ...prev, [postId]: false }));
      return;
    }

    videoEl.pause();
    setPausedVideoPostIds((prev) => ({ ...prev, [postId]: true }));
  };

  const toggleVideoMute = (postId: string) => {
    const videoEl = videoRefs.current[postId];
    if (!videoEl) return;

    const nextMuted = !videoEl.muted;
    videoEl.muted = nextMuted;
    setMutedVideoPostIds((prev) => ({ ...prev, [postId]: nextMuted }));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-[600px] px-4 pb-24 pt-6 space-y-6">
        <header className="mb-2">
          <h1 className="text-3xl font-black tracking-tight">Now</h1>
          <p className="mt-1 text-sm text-gray-500">Live feed of video, image, and POWR posts</p>
        </header>

        {storyUsers.length > 0 && (
          <section className="space-y-2">
            <div className="text-xs uppercase tracking-[0.12em] text-gray-500">Stories</div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {storyUsers.map((storyUser) => {
                const isViewed = storyUser.stories.every((story) => viewedStoryIds.includes(story.id));

                return (
                  <button
                    key={storyUser.userId}
                    type="button"
                    onClick={() => openStoryViewer(storyUser.userId)}
                    className="shrink-0 text-center"
                  >
                    <div
                      className={[
                        'relative w-14 h-14 rounded-full p-[2px] transition-colors',
                        isViewed ? 'bg-white/20' : 'bg-cyan-400',
                      ].join(' ')}
                    >
                      <div className="w-full h-full rounded-full bg-black p-[2px]">
                        <div className="relative w-full h-full rounded-full overflow-hidden bg-white/10">
                          {storyUser.avatarUrl ? (
                            <Image
                              src={storyUser.avatarUrl}
                              alt={`${storyUser.username} story`}
                              fill
                              unoptimized
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                      </div>
                      {!isViewed && <span className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-black" />}
                    </div>
                    <div className="mt-1 w-16 truncate text-[11px] text-gray-300">{storyUser.username}</div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {loading && <p className="text-sm text-gray-500">Loading feed...</p>}

        {emptyState && <p className="text-sm text-gray-500">No posts yet</p>}

        {!loading &&
          posts
            .filter((post) => !hiddenPostIds.includes(post.id))
            .map((post) => {
            const userProfile = getProfile(post.user_id);
              const postComments = getComments(post.id);
            const likeCount = getLikes(post.id).length;
              const commentCount = postComments.length;
            const liftCount = getLifts(post.id).length;
            const liked = hasLiked(post.id);
            const lifted = hasLifted(post.id);
            const saved = isSaved(post.id);
            const isOwner = post.user_id === user?.id;
            const fromFollowed = followingIds.includes(post.user_id);
            const chartRank = post.sound_id ? chartRankBySoundId[post.sound_id] : null;
            const verified = isProfileVerified(userProfile);

            return (
              <article key={post.id} className="border-b border-white/10 pb-6">
                <div className="mx-auto w-full max-w-[760px]">
                  {post.media_url ? (
                    <div
                      className="relative aspect-[4/5] w-full max-w-[520px] mx-auto overflow-hidden rounded-[16px]"
                      onMouseEnter={() => isVideoMedia(post.media_url || '') && setActiveVideoOverlayPostId(post.id)}
                      onMouseLeave={() => setActiveVideoOverlayPostId((prev) => (prev === post.id ? null : prev))}
                      onPointerDown={() => isVideoMedia(post.media_url || '') && setActiveVideoOverlayPostId(post.id)}
                    >
                      <div className="absolute left-0 right-0 top-0 z-10 flex items-start justify-between p-3 bg-gradient-to-b from-black/55 to-transparent">
                        <button
                          type="button"
                          onClick={() => router.push(`/profile/${userProfile?.id || post.user_id}`)}
                          className="flex items-center gap-2 text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                            {userProfile?.avatar_url ? (
                              <Image
                                src={userProfile.avatar_url}
                                alt={`${userProfile.username || 'User'} avatar`}
                                width={32}
                                height={32}
                                unoptimized
                                className="w-full h-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="leading-tight">
                            <div className="text-sm font-semibold inline-flex items-center">
                              @{userProfile?.username || 'user'}
                              {verified && <VerificationBadge />}
                            </div>
                            <div className="text-[11px] text-gray-300">{formatTimestamp(post.created_at)}</div>
                          </div>
                        </button>
                        <div className="flex items-center gap-3">
                          {fromFollowed && <span className="text-[11px] text-emerald-300">From someone you follow</span>}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setMenuPostId((prev) => (prev === post.id ? null : post.id))}
                              className="text-[18px] leading-none text-gray-200 hover:text-white"
                              aria-label="Post menu"
                            >
                              ...
                            </button>
                            {menuPostId === post.id && (
                              <div className="absolute right-0 top-7 z-20 w-44 rounded-xl border border-white/15 bg-black/95 p-1 text-xs">
                                {isOwner ? (
                                  <>
                                    <button type="button" onClick={() => void editPost(post.id, post.content || '')} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Edit</button>
                                    <button type="button" onClick={() => void deletePost(post.id)} className="block w-full rounded-lg px-3 py-2 text-left text-red-300 hover:bg-red-500/10">Delete</button>
                                  </>
                                ) : (
                                  <>
                                    <button type="button" onClick={() => void reportPost(post.id)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Report</button>
                                    <button type="button" onClick={() => void blockUser(post.user_id)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Block</button>
                                    <button type="button" onClick={() => hidePost(post.id)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Hide</button>
                                    {followingIds.includes(post.user_id) && (
                                      <button type="button" onClick={() => void unfollowUser(post.user_id)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Unfollow</button>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {isVideoMedia(post.media_url) ? (
                        <>
                          <video
                            ref={(el) => {
                              videoRefs.current[post.id] = el;
                            }}
                            src={post.media_url}
                            className="absolute inset-0 w-full h-full object-cover"
                            autoPlay
                            loop
                            muted={mutedVideoPostIds[post.id] ?? true}
                            playsInline
                            onPlay={() => setPausedVideoPostIds((prev) => ({ ...prev, [post.id]: false }))}
                            onPause={() => setPausedVideoPostIds((prev) => ({ ...prev, [post.id]: true }))}
                          />

                          <div
                            className={[
                              'absolute bottom-3 right-3 flex items-center gap-2 transition-opacity',
                              activeVideoOverlayPostId === post.id ? 'opacity-100' : 'opacity-0 pointer-events-none',
                            ].join(' ')}
                          >
                            <button
                              type="button"
                              onClick={() => void toggleVideoPlayback(post.id)}
                              className="rounded-full bg-black/60 px-3 py-1.5 text-[11px] text-white"
                            >
                              {pausedVideoPostIds[post.id] ? 'Play' : 'Pause'}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleVideoMute(post.id)}
                              className="rounded-full bg-black/60 px-3 py-1.5 text-[11px] text-white"
                            >
                              {mutedVideoPostIds[post.id] ?? true ? 'Unmute' : 'Mute'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <Image
                          src={post.media_url}
                          alt="Post media"
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 100vw, 520px"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="w-full max-w-[520px] mx-auto rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-4">
                      <div className="flex items-start justify-between">
                        <button
                          type="button"
                          onClick={() => router.push(`/profile/${userProfile?.id || post.user_id}`)}
                          className="flex items-center gap-2 text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                            {userProfile?.avatar_url ? (
                              <Image
                                src={userProfile.avatar_url}
                                alt={`${userProfile.username || 'User'} avatar`}
                                width={32}
                                height={32}
                                unoptimized
                                className="w-full h-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="leading-tight">
                            <div className="text-sm font-semibold inline-flex items-center">
                              @{userProfile?.username || 'user'}
                              {verified && <VerificationBadge />}
                            </div>
                            <div className="text-[11px] text-gray-400">{formatTimestamp(post.created_at)}</div>
                          </div>
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setMenuPostId((prev) => (prev === post.id ? null : post.id))}
                            className="text-[18px] leading-none text-gray-300 hover:text-white"
                            aria-label="Post menu"
                          >
                            ...
                          </button>
                          {menuPostId === post.id && (
                            <div className="absolute right-0 top-7 z-20 w-44 rounded-xl border border-white/15 bg-black/95 p-1 text-xs">
                              {isOwner ? (
                                <>
                                  <button type="button" onClick={() => void editPost(post.id, post.content || '')} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Edit</button>
                                  <button type="button" onClick={() => void deletePost(post.id)} className="block w-full rounded-lg px-3 py-2 text-left text-red-300 hover:bg-red-500/10">Delete</button>
                                </>
                              ) : (
                                <>
                                  <button type="button" onClick={() => void reportPost(post.id)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Report</button>
                                  <button type="button" onClick={() => void blockUser(post.user_id)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Block</button>
                                  <button type="button" onClick={() => hidePost(post.id)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Hide</button>
                                  {followingIds.includes(post.user_id) && (
                                    <button type="button" onClick={() => void unfollowUser(post.user_id)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Unfollow</button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="mt-4 text-2xl font-extrabold leading-tight text-left">{post.content}</p>
                    </div>
                  )}

                  <div className="mt-3 w-full max-w-[520px] mx-auto space-y-2 text-left">
                    {post.content && post.media_url && <p className="text-base font-semibold">{post.content}</p>}

                    {postComments.length > 0 && (
                      <div className="space-y-1">
                        {postComments.slice(-2).map((comment) => {
                          const commentUser = getProfile(comment.user_id);
                          return (
                            <p key={comment.id} className="text-sm text-gray-300">
                              <span className="font-semibold text-white mr-1">@{commentUser?.username || 'user'}</span>
                              {comment.content}
                            </p>
                          );
                        })}
                      </div>
                    )}

                    {(post.track_name || chartRank) && (
                      <div className="text-xs text-gray-400 space-y-1">
                        {post.track_name && (
                          <button
                            type="button"
                            onClick={() => void playPreviewAudio(`now-post:${post.id}`, post.sound_preview_url || null)}
                            onMouseEnter={() => {
                              if (canHoverPreview()) {
                                void playPreviewAudio(`now-post:${post.id}`, post.sound_preview_url || null);
                              }
                            }}
                            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-left text-[11px] text-white/90 transition-colors hover:bg-white/10"
                          >
                            {post.sound_cover_url && (
                              <Image
                                src={post.sound_cover_url}
                                alt=""
                                width={14}
                                height={14}
                                unoptimized
                                className="h-3.5 w-3.5 rounded object-cover"
                              />
                            )}
                            <span>🎵</span>
                            <span className="truncate">{post.track_name}{post.artist_name ? ` - ${post.artist_name}` : ''}</span>
                          </button>
                        )}
                        {typeof chartRank === 'number' && <div>#{chartRank} this week</div>}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-300">
                      <button type="button" onClick={() => void toggleLike(post.id)}>
                        {liked ? 'Liked' : 'Like'} {likeCount}
                      </button>
                      <button type="button" onClick={() => setActiveCommentsPost(post.id)}>
                        Comment {commentCount}
                      </button>
                      <button type="button" onClick={() => void toggleLift(post.id)}>
                        <span className={lifted ? 'text-cyan-300' : ''}>{lifted ? 'Lifted' : 'Lift'}</span> {liftCount}
                      </button>
                      <button type="button" onClick={() => void toggleSavePost(post.id)}>
                        {saved ? 'Saved' : 'Save'}
                      </button>
                    </div>

                    {activeCommentsPost === post.id && (
                      <div className="pt-2 space-y-2">
                        <input
                          value={newComment}
                          onChange={(event) => setNewComment(event.target.value)}
                          placeholder="Write a comment"
                          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void addComment(post.id)}
                            className="px-3 py-1.5 rounded-full bg-white/15 text-sm"
                          >
                            Post
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveCommentsPost(null)}
                            className="px-3 py-1.5 rounded-full bg-white/5 text-sm text-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
      </div>

      {activeStoryUser && activeStory && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={closeStoryViewer}>
          <div
            className="w-full max-w-[560px] rounded-2xl border border-white/10 bg-[#0C0C0C] overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10">
                  {activeStoryUser.avatarUrl ? (
                    <Image
                      src={activeStoryUser.avatarUrl}
                      alt={`${activeStoryUser.username} avatar`}
                      width={32}
                      height={32}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="text-sm font-semibold inline-flex items-center">
                  @{activeStoryUser.username}
                  {activeStoryUser.verified && <VerificationBadge />}
                </div>
              </div>
              <div className="mt-2 flex gap-1.5">
                {activeStoryUser.stories.map((story, index) => (
                  <span
                    key={story.id}
                    className={[
                      'h-1 flex-1 rounded-full',
                      index <= activeStoryIndex ? 'bg-white/85' : 'bg-white/20',
                    ].join(' ')}
                  />
                ))}
              </div>
            </div>

            <div className="relative bg-black max-h-[70vh]">
              {isVideoMedia(activeStory.media_url) ? (
                <video
                  key={activeStory.id}
                  src={activeStory.media_url}
                  className="w-full max-h-[70vh] object-contain bg-black"
                  autoPlay
                  muted
                  playsInline
                  onEnded={nextStory}
                />
              ) : (
                <Image
                  src={activeStory.media_url}
                  alt="Story"
                  width={1200}
                  height={1200}
                  unoptimized
                  className="w-full max-h-[70vh] object-contain bg-black"
                />
              )}

              <button type="button" onClick={prevStory} className="absolute left-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-black/45 text-white/85 text-xs">
                Prev
              </button>
              <button type="button" onClick={nextStory} className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-black/45 text-white/85 text-xs">
                Next
              </button>
            </div>

            {activeStory.content && <div className="px-4 py-3 text-sm text-gray-300">{activeStory.content}</div>}
          </div>
        </div>
      )}
    </div>
  );
}