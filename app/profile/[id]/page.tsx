'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useMemo } from 'react';
import { supabase, processMedia } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import VerificationBadge from '@/components/VerificationBadge';
import CreatorBadge from '@/components/CreatorBadge';

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio?: string | null;
  is_creator?: boolean | null;
  is_verified?: boolean;
  verified?: boolean;
};

type Post = {
  id: string;
  content: string;
  media_url?: string | null;
  media_urls?: string[] | null;
  user_id: string;
  created_at?: string | null;
  sound_id?: string | null;
};

type ChartImpact = {
  movementsInfluenced: number;
  soundsBoosted: number;
  soundsEnteredCharts: number;
  highestChartPosition: number | null;
};

type ChartScoreImpactRow = {
  sound_id: string | null;
  rank: number | null;
  movement: string | null;
  lifecycle: string | null;
};

type Lift = {
  id: string;
  user_id: string;
  post_id: string;
  created_at?: string;
};

async function withAuthFetch(path: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) throw new Error('Missing auth session');

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json.error || 'Request failed');
  }

  return json;
}

export default function Page() {
  const params = useParams();
  const routeId = String((params?.id || params?.username || '') as string);
  const routeIdLower = routeId.trim().toLowerCase();

  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [resolvedProfileId, setResolvedProfileId] = useState(routeId);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [likes, setLikes] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [listType, setListType] = useState<'followers' | 'following' | null>(null);

  const [activePost, setActivePost] = useState<Post | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [gridCommentInputs, setGridCommentInputs] = useState<Record<string, string>>({});

  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);

  const [tab, setTab] = useState<'posts' | 'powr' | 'likes' | 'lifted'>('posts');
  const [powrPosts, setPowrPosts] = useState<any[]>([]);
  const [likedPowrPosts, setLikedPowrPosts] = useState<any[]>([]);
  const [liftedPowrPosts, setLiftedPowrPosts] = useState<any[]>([]);
  const [lifts, setLifts] = useState<Lift[]>([]);
  const [replyInputs, setReplyInputs] = useState<any>({});
  const [newPowr, setNewPowr] = useState('');
  const [chartImpact, setChartImpact] = useState<ChartImpact>({
    movementsInfluenced: 0,
    soundsBoosted: 0,
    soundsEnteredCharts: 0,
    highestChartPosition: null,
  });
  const [influenceScore, setInfluenceScore] = useState(0);
  const [influenceLabel, setInfluenceLabel] = useState<'Low' | 'Rising' | 'Strong' | 'Dominant'>('Low');
  const [ownsTrendSignal, setOwnsTrendSignal] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [commentScroll, setCommentScroll] = useState(0);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(null);
  const [avatarCropOpen, setAvatarCropOpen] = useState(false);
  const [avatarCropSource, setAvatarCropSource] = useState<string | null>(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [retryAvatarFile, setRetryAvatarFile] = useState<File | null>(null);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);

  const [showCreateMenu, setShowCreateMenu] = useState(false); // ✅ ADDED
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const [activity] = useState({
    last: 'Strength Training',
    streak: 6,
    focus: ['Fitness', 'Discipline'],
  });

  const profileUrl = `https://ruehl.app/profile/${profile?.username || routeId}`;

  const fetchData = async () => {
    const { data: userData } = await supabase.auth.getUser();
    setCurrentUser(userData.user);

    let { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', routeId)
      .maybeSingle();

    if (!profileData) {
      const fallbackProfile = await supabase
        .from('profiles')
        .select('*')
        .eq('username', routeId)
        .maybeSingle();

      profileData = fallbackProfile.data;
    }

    if (!profileData?.id) {
      setProfile(null);
      return;
    }

    const canonicalUsername = (profileData.username || '').trim().toLowerCase();
    const onLegacyProfileRoute = Boolean(params?.id);
    if (canonicalUsername && (onLegacyProfileRoute || canonicalUsername !== routeIdLower)) {
      router.replace(`/${canonicalUsername}`);
      return;
    }

    const targetProfileId = profileData.id;
    setResolvedProfileId(targetProfileId);

    const { data: allProfilesData } = await supabase
      .from('profiles')
      .select('*');

    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', targetProfileId)
      .order('created_at', { ascending: false });

    const soundIds = [...new Set(((postsData || []) as Post[])
      .map((post) => post.sound_id)
      .filter((soundId): soundId is string => typeof soundId === 'string' && !!soundId))];

    let movementsInfluenced = 0;
    let soundsBoosted = 0;
    let soundsEnteredCharts = 0;
    let highestChartPosition: number | null = null;
    let trendOwnership = false;

    if (soundIds.length > 0) {
      const { data: chartRows } = await supabase
        .from('chart_scores')
        .select('sound_id, rank, movement, lifecycle')
        .in('sound_id', soundIds);

      const chartBySoundId = (((chartRows as unknown) as ChartScoreImpactRow[] | null) || []).reduce<Record<string, ChartScoreImpactRow>>(
        (acc, row) => {
          if (!row.sound_id) return acc;
          const existing = acc[row.sound_id];
          const existingRank = existing?.rank ?? Number.POSITIVE_INFINITY;
          const nextRank = row.rank ?? Number.POSITIVE_INFINITY;

          if (!existing || nextRank < existingRank) {
            acc[row.sound_id] = row;
          }

          return acc;
        },
        {}
      );

      soundsEnteredCharts = Object.values(chartBySoundId).filter((row) => {
        const rank = row.rank;
        return typeof rank === 'number' && rank >= 1 && rank <= 20;
      }).length;

      highestChartPosition = Object.values(chartBySoundId).reduce<number | null>((best, row) => {
        const rank = row.rank;
        if (typeof rank !== 'number' || rank <= 0) return best;
        if (best === null) return rank;
        return rank < best ? rank : best;
      }, null);

      const boostedSoundIds = Object.entries(chartBySoundId)
        .filter(([, row]) => {
          const movementRaw = (row.movement || '').trim().toLowerCase();
          const movementValue = Number.parseInt(movementRaw.replace(/[^\d+-]/g, ''), 10);
          const isRisingMovement = movementRaw.includes('up') || (!Number.isNaN(movementValue) && movementValue > 0);
          const isRisingLifecycle = (row.lifecycle || '').trim().toLowerCase() === 'rising';
          return isRisingMovement || isRisingLifecycle;
        })
        .map(([soundId]) => soundId);

      soundsBoosted = boostedSoundIds.length;

      movementsInfluenced = ((postsData || []) as Post[]).filter((post) => {
        if (!post.sound_id) return false;
        const chartRow = chartBySoundId[post.sound_id];
        if (!chartRow) return false;

        const movementRaw = (chartRow.movement || '').trim().toLowerCase();
        const movementValue = Number.parseInt(movementRaw.replace(/[^\d+-]/g, ''), 10);
        const isRisingMovement = movementRaw.includes('up') || (!Number.isNaN(movementValue) && movementValue > 0);
        const isRisingLifecycle = (chartRow.lifecycle || '').trim().toLowerCase() === 'rising';

        return isRisingMovement || isRisingLifecycle;
      }).length;

      const { data: soundPostsData } = await supabase
        .from('posts')
        .select('sound_id, user_id, likes_count, comments_count')
        .in('sound_id', soundIds)
        .not('sound_id', 'is', null);

      const perSoundUserContribution = ((soundPostsData || []) as Array<{ sound_id: string | null; user_id: string | null; likes_count?: number | null; comments_count?: number | null }>)
        .reduce<Record<string, Record<string, number>>>((acc, row) => {
          if (!row.sound_id || !row.user_id) return acc;
          if (!acc[row.sound_id]) acc[row.sound_id] = {};
          const score = 0.5 + ((row.likes_count || 0) + (row.comments_count || 0)) * 0.5;
          acc[row.sound_id][row.user_id] = (acc[row.sound_id][row.user_id] || 0) + score;
          return acc;
        }, {});

      trendOwnership = Object.values(perSoundUserContribution).some((userScores) => {
        const sorted = Object.entries(userScores).sort((a, b) => b[1] - a[1]);
        return sorted[0]?.[0] === targetProfileId;
      });
    }

    const { data: commentsData } = await supabase.from('comments').select('*');
    const { data: likesData } = await supabase.from('likes').select('*');
    const { data: liftsData } = await supabase.from('post_lifts').select('*');

    const soundPostIds = (((postsData || []) as Post[])
      .filter((post) => !!post.sound_id)
      .map((post) => post.id));

    const likeCountByPost = ((likesData || []) as Array<{ post_id?: string | null }>).reduce<Record<string, number>>((acc, row) => {
      const postId = row.post_id || '';
      if (!postId) return acc;
      acc[postId] = (acc[postId] || 0) + 1;
      return acc;
    }, {});

    const commentCountByPost = ((commentsData || []) as Array<{ post_id?: string | null }>).reduce<Record<string, number>>((acc, row) => {
      const postId = row.post_id || '';
      if (!postId) return acc;
      acc[postId] = (acc[postId] || 0) + 1;
      return acc;
    }, {});

    const liftCountByPost = ((liftsData || []) as Array<{ post_id?: string | null }>).reduce<Record<string, number>>((acc, row) => {
      const postId = row.post_id || '';
      if (!postId) return acc;
      acc[postId] = (acc[postId] || 0) + 1;
      return acc;
    }, {});

    const engagementGeneratedOnSounds = soundPostIds.reduce((sum, postId) => {
      return sum + (likeCountByPost[postId] || 0) + (commentCountByPost[postId] || 0) + (liftCountByPost[postId] || 0);
    }, 0);

    const computedInfluenceScore = engagementGeneratedOnSounds + movementsInfluenced;
    const computedInfluenceLabel: 'Low' | 'Rising' | 'Strong' | 'Dominant' =
      computedInfluenceScore >= 260 ? 'Dominant'
        : computedInfluenceScore >= 120 ? 'Strong'
          : computedInfluenceScore >= 40 ? 'Rising'
            : 'Low';

    const { data: followersData } = await supabase
      .from('follows')
      .select('*')
      .eq('following_id', targetProfileId);

    const { data: followingData } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', targetProfileId);

    const { data: powrData } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', targetProfileId)
      .is('media_url', null)
      .order('created_at', { ascending: false });

    const { data: likedRows } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', targetProfileId);

    const likedPostIds = [...new Set((likedRows || []).map((row: any) => row.post_id).filter(Boolean))];

    let likedPowrData: any[] = [];
    if (likedPostIds.length > 0) {
      const { data } = await supabase
        .from('posts')
        .select('*')
        .in('id', likedPostIds)
        .is('media_url', null)
        .order('created_at', { ascending: false });
      likedPowrData = data || [];
    }

    const { data: liftedRows } = await supabase
      .from('post_lifts')
      .select('post_id')
      .eq('user_id', targetProfileId);

    const liftedPostIds = [...new Set((liftedRows || []).map((row: any) => row.post_id).filter(Boolean))];

    let liftedPowrData: any[] = [];
    if (liftedPostIds.length > 0) {
      const { data } = await supabase
        .from('posts')
        .select('*')
        .in('id', liftedPostIds)
        .is('media_url', null)
        .order('created_at', { ascending: false });
      liftedPowrData = data || [];
    }

    setProfile(profileData);
    setAllProfiles(allProfilesData || []);
    setPosts(postsData || []);
    setComments(commentsData || []);
    setLikes(likesData || []);
    setFollowers(followersData || []);
    setFollowing(followingData || []);
    setPowrPosts(powrData || []);
    setLikedPowrPosts(likedPowrData || []);
    setLiftedPowrPosts(liftedPowrData || []);
    setLifts((liftsData || []) as Lift[]);
    setChartImpact({
      movementsInfluenced,
      soundsBoosted,
      soundsEnteredCharts,
      highestChartPosition,
    });
    setInfluenceScore(computedInfluenceScore);
    setInfluenceLabel(computedInfluenceLabel);
    setOwnsTrendSignal(trendOwnership);

    if (userData.user) {
      const { data: followData } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', userData.user.id)
        .eq('following_id', targetProfileId)
        .maybeSingle();

      setIsFollowing(!!followData);
    }
  };

  const sortPostsByNewest = (items: Post[]) => {
    return [...items].sort((a, b) => {
      const aTs = new Date(a.created_at || 0).getTime();
      const bTs = new Date(b.created_at || 0).getTime();
      return bTs - aTs;
    });
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('profile-engagement')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'comments' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_lifts' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [routeId]);

  useEffect(() => {
    if (!resolvedProfileId) return;

    const channel = supabase
      .channel(`profile-posts-realtime:${resolvedProfileId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          const incoming = payload.new as Post;
          if (!incoming?.id || incoming.user_id !== resolvedProfileId) return;

          setPosts((prev) => {
            if (prev.some((item) => item.id === incoming.id)) return prev;
            return sortPostsByNewest([incoming, ...prev]);
          });

          const incomingHasMedia = getPostMediaItems(incoming).length > 0;
          if (!incomingHasMedia) {
            setPowrPosts((prev) => {
              if (prev.some((item) => item.id === incoming.id)) return prev;
              return sortPostsByNewest([incoming, ...prev]);
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        (payload) => {
          const incoming = payload.new as Post;
          if (!incoming?.id) return;

          setPosts((prev) => {
            const exists = prev.some((item) => item.id === incoming.id);

            if (incoming.user_id !== resolvedProfileId) {
              if (!exists) return prev;
              return prev.filter((item) => item.id !== incoming.id);
            }

            if (!exists) return sortPostsByNewest([incoming, ...prev]);
            return sortPostsByNewest(prev.map((item) => (item.id === incoming.id ? { ...item, ...incoming } : item)));
          });

          setPowrPosts((prev) => {
            const exists = prev.some((item) => item.id === incoming.id);
            const hasMedia = getPostMediaItems(incoming).length > 0;

            if (incoming.user_id !== resolvedProfileId || hasMedia) {
              if (!exists) return prev;
              return prev.filter((item) => item.id !== incoming.id);
            }

            if (!exists) return sortPostsByNewest([incoming, ...prev]);
            return sortPostsByNewest(prev.map((item) => (item.id === incoming.id ? { ...item, ...incoming } : item)));
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          const removed = payload.old as Pick<Post, 'id'>;
          if (!removed?.id) return;

          setPosts((prev) => prev.filter((item) => item.id !== removed.id));
          setPowrPosts((prev) => prev.filter((item) => item.id !== removed.id));
          setLikedPowrPosts((prev) => prev.filter((item) => item.id !== removed.id));
          setLiftedPowrPosts((prev) => prev.filter((item) => item.id !== removed.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedProfileId]);

  useEffect(() => {
    return () => {
      if (localAvatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(localAvatarPreview);
      }
    };
  }, [localAvatarPreview]);

  useEffect(() => {
    return () => {
      if (avatarCropSource?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarCropSource);
      }
    };
  }, [avatarCropSource]);

  const debounce = <T extends (...args: any[]) => void>(fn: T, delay = 100) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const handleCommentScroll = (event: React.UIEvent<HTMLDivElement>) => {
    setCommentScroll(event.currentTarget.scrollTop);
  };

  const debouncedHandleCommentScroll = debounce(handleCommentScroll, 80);

  const getUserProfile = (userId: string) =>
    allProfiles.find((p) => p.id === userId);

  const isProfileVerified = (userProfile?: Profile | null) => Boolean(userProfile?.is_verified ?? userProfile?.verified);

  const getPowrPostLikes = (postId: string) =>
    likes.filter((l: any) => l.post_id === postId).length;

  const getPowrPostComments = (postId: string) =>
    comments.filter((c: any) => c.post_id === postId);

  const getPowrPostLifts = (postId: string) =>
    lifts.filter((l: Lift) => l.post_id === postId).length;

  const hasPowrLiked = (postId: string) =>
    likes.some((l: any) => l.post_id === postId && l.user_id === currentUser?.id);

  const hasPowrLifted = (postId: string) =>
    lifts.some((l: Lift) => l.post_id === postId && l.user_id === currentUser?.id);

  const trendShaperLevel = useMemo(() => {
    const score = chartImpact.movementsInfluenced + chartImpact.soundsBoosted * 1.5 + chartImpact.soundsEnteredCharts * 2;
    if (score >= 18) return 'Elite trend shaper';
    if (score >= 10) return 'Early adopter';
    if (score >= 4) return 'Emerging trend shaper';
    return null;
  }, [chartImpact]);

  const parseMediaUrls = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean);
        }
      } catch {
        return [];
      }
    }

    return [];
  };

  const getPostMediaItems = (post: Post): string[] => {
    const multi = parseMediaUrls(post.media_urls);
    if (multi.length > 0) return multi;

    if (!post.media_url) return [];

    const single = post.media_url.trim();
    if (!single) return [];

    if (single.startsWith('[')) {
      const parsedFromSingle = parseMediaUrls(single);
      if (parsedFromSingle.length > 0) return parsedFromSingle;
    }

    return [single];
  };

  const isVideoUrl = (url: string) => /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);

  const getGridPostLikes = (postId: string) =>
    likes.filter((l: any) => l.post_id === postId).length;

  const getGridPostComments = (postId: string) =>
    comments.filter((c: any) => c.post_id === postId);

  const hasGridLiked = (postId: string) =>
    likes.some((l: any) => l.post_id === postId && l.user_id === currentUser?.id);

  const toggleGridLike = async (postId: string) => {
    if (!currentUser) return;

    const existing = likes.find(
      (l: any) => l.post_id === postId && l.user_id === currentUser.id
    );

    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('likes').insert({
        user_id: currentUser.id,
        post_id: postId,
      });
    }

    fetchData();
  };

  const addGridComment = async (postId: string) => {
    const content = gridCommentInputs[postId];
    if (!content?.trim() || !currentUser) return;

    await supabase.from('comments').insert({
      content,
      user_id: currentUser.id,
      post_id: postId,
    });

    setGridCommentInputs(prev => ({ ...prev, [postId]: '' }));
    fetchData();
  };

  const shareGridPost = async (postId: string) => {
    const postUrl = `${profileUrl}?post=${postId}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'RUEHL Post', url: postUrl });
        return;
      } catch {
        // Fall back to clipboard if share sheet is dismissed/unavailable.
      }
    }

    try {
      await navigator.clipboard.writeText(postUrl);
      alert('Post link copied to clipboard.');
    } catch {
      alert('Unable to share right now.');
    }
  };

  const togglePowrLike = async (postId: string) => {
    if (!currentUser) return;

    const existing = likes.find(
      (l: any) => l.post_id === postId && l.user_id === currentUser.id
    );

    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('likes').insert({
        user_id: currentUser.id,
        post_id: postId,
      });
    }

    fetchData();
  };

  const addPowrComment = async (postId: string) => {
    const content = replyInputs[postId];
    if (!content?.trim() || !currentUser) return;

    await supabase.from('comments').insert({
      content,
      user_id: currentUser.id,
      post_id: postId,
    });

    setReplyInputs((prev: any) => ({ ...prev, [postId]: '' }));
    fetchData();
  };

  const togglePowrLift = async (postId: string) => {
    if (!currentUser) return;

    const existing = lifts.find(
      (l: Lift) => l.post_id === postId && l.user_id === currentUser.id
    );

    if (existing) {
      await supabase.from('post_lifts').delete().eq('id', existing.id);
    } else {
      await supabase.from('post_lifts').insert({
        user_id: currentUser.id,
        post_id: postId,
      });
    }

    fetchData();
  };

  const editPowrComment = async (commentId: string) => {
    if (!editingCommentText.trim() || !currentUser) return;

    await supabase
      .from('comments')
      .update({ content: editingCommentText })
      .eq('id', commentId);

    setEditingCommentId(null);
    setEditingCommentText('');
    fetchData();
  };

  const startEditComment = (commentId: string, body: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(body);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const deletePowrComment = async (commentId: string, userId: string) => {
    if (!currentUser || currentUser.id !== userId) return;

    await supabase.from('comments').delete().eq('id', commentId);
    fetchData();
  };

  const createPowrPost = async () => {
    if (!newPowr.trim() || !currentUser) return;

    await supabase.from('posts').insert({
      user_id: currentUser.id,
      content: newPowr,
      media_url: null,
      created_at: new Date().toISOString(),
    });

    setNewPowr('');
    fetchData();
  };

  const buildCroppedAvatarFile = async (file: File, zoom: number) => {
    const imageUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = document.createElement('img');
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      const size = 720;
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to create canvas context');

      const base = Math.min(image.width, image.height);
      const cropSize = base / Math.max(1, zoom);
      const sx = (image.width - cropSize) / 2;
      const sy = (image.height - cropSize) / 2;

      ctx.drawImage(image, sx, sy, cropSize, cropSize, 0, 0, size, size);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.95);
      });

      if (!blob) throw new Error('Failed to create cropped image');

      return new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
        type: 'image/jpeg',
      });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const uploadAvatarFile = async (file: File, previewUrl?: string) => {
    if (!currentUser || currentUser.id !== resolvedProfileId) return;

    if (previewUrl) {
      setLocalAvatarPreview(prev => {
        if (prev && prev !== previewUrl && prev.startsWith('blob:')) {
          URL.revokeObjectURL(prev);
        }
        return previewUrl;
      });
    }

    setAvatarUploading(true);
    setAvatarUploadError(null);
    setRetryAvatarFile(file);

    try {
      const finalFile = await processMedia(file);
      const fileExt = finalFile.name.split('.').pop() || 'jpg';
      const filePath = `avatars/${currentUser.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, finalFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const avatarUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      setProfile(prev => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
      setAllProfiles(prev =>
        prev.map(p => (p.id === currentUser.id ? { ...p, avatar_url: avatarUrl } : p))
      );

      localStorage.setItem('ruehl:avatar-url', avatarUrl);
      localStorage.setItem('ruehl:avatar-updated-at', Date.now().toString());
      window.dispatchEvent(
        new CustomEvent('ruehl:avatar-updated', {
          detail: { userId: currentUser.id, avatarUrl },
        })
      );

      setRetryAvatarFile(null);
      setLocalAvatarPreview(prev => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (error) {
      console.error('Avatar upload failed:', error);
      setAvatarUploadError('Upload failed. Retry?');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;
    if (!currentUser || currentUser.id !== resolvedProfileId) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    setAvatarUploadError(null);
    setPendingAvatarFile(file);
    setAvatarZoom(1);
    setAvatarCropSource(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setAvatarCropOpen(true);
  };

  const confirmAvatarCrop = async () => {
    if (!pendingAvatarFile) return;

    try {
      const croppedFile = await buildCroppedAvatarFile(pendingAvatarFile, avatarZoom);
      const previewUrl = URL.createObjectURL(croppedFile);

      setAvatarCropOpen(false);
      setPendingAvatarFile(null);
      setAvatarCropSource(prev => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });

      await uploadAvatarFile(croppedFile, previewUrl);
    } catch (error) {
      console.error('Avatar crop failed:', error);
      alert('Failed to crop image. Please try again.');
    }
  };

  const cancelAvatarCrop = () => {
    setAvatarCropOpen(false);
    setPendingAvatarFile(null);
    setAvatarCropSource(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    setAvatarZoom(1);
  };

  const toggleFollow = async () => {
    if (!currentUser || currentUser.id === resolvedProfileId) return;

    setLoadingFollow(true);

    try {
      if (isFollowing) {
        await withAuthFetch(`/api/follows?following_id=${encodeURIComponent(resolvedProfileId)}`, {
          method: 'DELETE',
        });
        setIsFollowing(false);
      } else {
        await withAuthFetch('/api/follows', {
          method: 'POST',
          body: JSON.stringify({ following_id: resolvedProfileId }),
        });
        setIsFollowing(true);
      }

      await fetchData();
    } catch (followError) {
      console.error(followError);
    }

    setLoadingFollow(false);
  };

  const shareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `@${profile?.username || 'RUEHL profile'}`,
          url: profileUrl,
        });
        return;
      } catch {
        // Fall through to clipboard.
      }
    }

    await navigator.clipboard.writeText(profileUrl);
  };

  const copyProfileUrl = async () => {
    await navigator.clipboard.writeText(profileUrl);
  };

  const blockProfile = async () => {
    if (!resolvedProfileId || currentUser?.id === resolvedProfileId) return;

    setActionBusy(true);

    try {
      await withAuthFetch('/api/blocks', {
        method: 'POST',
        body: JSON.stringify({ blocked_id: resolvedProfileId }),
      });

      setShowProfileMenu(false);
      router.replace('/');
    } catch (blockError) {
      console.error(blockError);
    } finally {
      setActionBusy(false);
    }
  };

  const submitReport = async () => {
    if (!resolvedProfileId || !reportReason.trim()) return;

    setActionBusy(true);

    try {
      await withAuthFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          target_user_id: resolvedProfileId,
          reason: reportReason.trim(),
        }),
      });

      setReportReason('');
      setShowReportModal(false);
      setShowProfileMenu(false);
    } catch (reportError) {
      console.error(reportError);
    } finally {
      setActionBusy(false);
    }
  };

  const gridPosts = useMemo(
    () => posts.filter(p => getPostMediaItems(p).length > 0),
    [posts]
  );
  const mediaPosts = useMemo(
    () =>
      gridPosts.map(post => {
        const mediaItems = getPostMediaItems(post);
        const isVideo = mediaItems.length > 0 ? isVideoUrl(mediaItems[0]) : false;
        return { ...post, isVideo, mediaItems };
      }),
    [gridPosts]
  );

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto w-full max-w-[960px] bg-black text-white pb-32">

        {/* HEADER SECTION */}
        <div className="px-4 pt-4 pb-8 sm:px-6 lg:px-8">

          {/* TOP ACTION BUTTONS */}
          <div className="flex justify-end gap-3 mb-6">
            {currentUser?.id === resolvedProfileId && (
              <>
                <button
                  onClick={() => router.push('/settings')}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:bg-white/30"
                >
                  ⚙️
                </button>
              </>
            )}
            <button
              onClick={() => setShowProfileMenu(true)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:bg-white/30"
            >
              ⋯
            </button>
          </div>

          {/* PROFILE INFO */}
          <div className="flex gap-4 items-start">
            {/* AVATAR */}
            <div className="relative">
              <label
                className={`block w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-1 flex-shrink-0 ${
                  currentUser?.id === resolvedProfileId ? 'cursor-pointer' : ''
                }`}
              >
                {profile.avatar_url ? (
                  <div className="w-full h-full rounded-full overflow-hidden bg-black relative">
                    <Image
                      src={localAvatarPreview || profile.avatar_url}
                      alt={`${profile.username} avatar`}
                      fill
                      unoptimized
                      sizes="96px"
                      className="object-cover"
                    />
                    {currentUser?.id === resolvedProfileId && (
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/35 active:bg-black/45 transition-colors" />
                    )}
                    {avatarUploading && (
                      <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-white/35 border-t-white animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-700 relative">
                    {localAvatarPreview && (
                      <Image
                        src={localAvatarPreview}
                        alt="Avatar preview"
                        fill
                        unoptimized
                        sizes="96px"
                        className="object-cover rounded-full"
                      />
                    )}
                    {currentUser?.id === resolvedProfileId && (
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/35 active:bg-black/45 transition-colors rounded-full" />
                    )}
                    {avatarUploading && (
                      <div className="absolute inset-0 bg-black/55 flex items-center justify-center rounded-full">
                        <div className="w-8 h-8 rounded-full border-2 border-white/35 border-t-white animate-spin" />
                      </div>
                    )}
                  </div>
                )}
                {currentUser?.id === resolvedProfileId && (
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={avatarUploading}
                  />
                )}
              </label>
              {currentUser?.id === resolvedProfileId && (
                <div className="text-[10px] text-center text-gray-500 mt-1">
                  {avatarUploading ? 'Saving...' : 'Tap to change'}
                </div>
              )}
              {currentUser?.id === resolvedProfileId && avatarUploadError && retryAvatarFile && !avatarUploading && (
                <button
                  onClick={async () => {
                    const preview = localAvatarPreview || URL.createObjectURL(retryAvatarFile);
                    await uploadAvatarFile(retryAvatarFile, preview);
                  }}
                  className="mt-1 w-full text-[10px] rounded-md bg-red-500/15 border border-red-500/35 text-red-300 py-1"
                >
                  Retry Upload
                </button>
              )}
            </div>

            {/* INFO */}
            <div className="flex-1 pt-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold">@{profile.username}</span>
                {isProfileVerified(profile) && <VerificationBadge />}
                {profile.is_creator && <CreatorBadge />}
              </div>
              <div className="text-sm text-gray-400">
                {profile.bio || 'No bio yet'}
              </div>
              {profile.is_creator && (
                <div className="mt-2 text-[11px] text-amber-200/85">This member hosts creator-led sessions.</div>
              )}
            </div>
          </div>

          {/* STATS - LARGE AND BOLD */}
          <div className="flex gap-8 mt-8">
            <div>
              <div className="text-3xl font-black">{posts.length}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Posts</div>
            </div>
            <button
              onClick={() => router.push(`/followers/${resolvedProfileId}`)}
              className="text-left active:opacity-80 transition-opacity"
            >
              <div className="text-3xl font-black">{followers.length}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Followers</div>
            </button>
            <button
              onClick={() => router.push(`/following/${resolvedProfileId}`)}
              className="text-left active:opacity-80 transition-opacity"
            >
              <div className="text-3xl font-black">{following.length}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Following</div>
            </button>
          </div>

          <div className="mt-6">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Chart Impact</div>
            <div className="mt-2 text-sm text-gray-300">{chartImpact.movementsInfluenced} movements influenced</div>
            <div className="text-sm text-gray-400">{chartImpact.soundsBoosted} sounds boosted</div>
            <div className="text-sm text-gray-400">{chartImpact.soundsEnteredCharts} sounds entered charts</div>
            <div className="text-sm text-gray-400">
              Highest chart position reached: {chartImpact.highestChartPosition ? `#${chartImpact.highestChartPosition}` : '—'}
            </div>
            {trendShaperLevel && (
              <div className="mt-2 inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-200">
                {trendShaperLevel}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Chart Influence</div>
            <div className="mt-1 text-2xl font-black text-white">{influenceScore}</div>
            <div className="text-xs text-cyan-200">{influenceLabel}</div>
            {ownsTrendSignal && (
              <div className="mt-2 inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-200">
                You are shaping this trend
              </div>
            )}
          </div>

          {/* CURRENT SOUND CARD */}
          <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur active:bg-white/10 transition-colors">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Current Sound</div>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-500 to-pink-500 flex-shrink-0 flex items-center justify-center text-2xl">
                ♫
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white">Unstoppable</div>
                <div className="text-sm text-gray-400">Sia</div>
              </div>
              <button className="px-3 py-2 rounded-full bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 active:bg-green-500/40 transition-colors flex-shrink-0">
                Open ↗
              </button>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-2 mt-6 justify-center">
            {currentUser?.id === resolvedProfileId ? (
              <button onClick={() => router.push('/edit-profile')} className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-sm transition-colors touch-highlight-trasparent">
                Edit Profile
              </button>
            ) : (
              <button
                onClick={toggleFollow}
                disabled={loadingFollow}
                className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-sm transition-colors disabled:opacity-60"
              >
                {loadingFollow ? 'Please wait...' : isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
            <button onClick={shareProfile} className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-sm transition-colors">
              Share Profile
            </button>
            {currentUser?.id === resolvedProfileId && (
              <button
                onClick={() => setShowCreateMenu(!showCreateMenu)}
                className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold hover:shadow-lg active:shadow-md transition-all relative"
              >
                + Create
              </button>
            )}
          </div>

        </div>

        {/* MOMENTS HEADER */}
        <div className="px-4 py-6 flex items-center justify-between border-t border-white/10 sm:px-6 lg:px-8">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Moments</div>
          <button className="text-sm text-green-400 font-semibold hover:text-green-300 active:text-green-500 transition-colors">
            + Add
          </button>
        </div>

        {/* POSTS / POWR / LIKES / LIFTED TABS */}
        <div className="px-4 flex gap-5 border-b border-white/10 overflow-x-auto sm:px-6 lg:px-8">
          <button
            onClick={() => setTab('posts')}
            className={`pb-4 text-sm font-semibold transition-colors ${
              tab === 'posts' ? 'text-white border-b-2 border-white' : 'text-gray-500'
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setTab('powr')}
            className={`pb-4 text-sm font-semibold transition-colors ${
              tab === 'powr' ? 'text-white border-b-2 border-white' : 'text-gray-500'
            }`}
          >
            POWR
          </button>
          <button
            onClick={() => setTab('likes')}
            className={`pb-4 text-sm font-semibold transition-colors ${
              tab === 'likes' ? 'text-white border-b-2 border-white' : 'text-gray-500'
            }`}
          >
            Likes
          </button>
          <button
            onClick={() => setTab('lifted')}
            className={`pb-4 text-sm font-semibold transition-colors ${
              tab === 'lifted' ? 'text-white border-b-2 border-white' : 'text-gray-500'
            }`}
          >
            Lifted
          </button>
        </div>

        {/* POSTS TAB */}
        {tab === 'posts' && (
          <div className="px-4 pt-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-3 gap-1 md:grid-cols-4 lg:grid-cols-5">
              {mediaPosts.map(post => (
                <button
                  key={post.id}
                  onClick={() => {
                    setActivePost(post);
                    setActiveMediaIndex(0);
                  }}
                  className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg active:opacity-75 transition-opacity"
                >
                  {post.isVideo ? (
                    <video
                      src={post.mediaItems[0]}
                      onMouseEnter={e => {
                        const target = e.currentTarget as HTMLVideoElement;
                        target.play().catch(() => {});
                      }}
                      onMouseLeave={e => {
                        const target = e.currentTarget as HTMLVideoElement;
                        target.pause();
                        target.currentTime = 0;
                      }}
                      className="aspect-square object-cover"
                      muted
                      playsInline
                      loop
                    />
                  ) : (
                    <Image
                      src={post.mediaItems[0]}
                      alt="Grid post media"
                      fill
                      unoptimized
                      sizes="(max-width: 1024px) 33vw, 20vw"
                      className="object-cover"
                    />
                  )}
                  {post.mediaItems.length > 1 && (
                    <div className="absolute top-1.5 right-1.5 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {activePost?.id === post.id ? activeMediaIndex + 1 : 1}/{post.mediaItems.length}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 group-active:bg-black/50 transition-colors flex items-center justify-center">
                    <div className="text-white text-3xl opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                      {post.isVideo ? '▶' : post.mediaItems.length > 1 ? '▦' : '🖼'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {showProfileMenu && (
          <div className="fixed inset-0 bg-black/65 z-50 flex items-end justify-center p-4" onClick={() => setShowProfileMenu(false)}>
            <div className="w-full max-w-[380px] rounded-2xl border border-white/10 bg-[#101010] p-3" onClick={(event) => event.stopPropagation()}>
              <button onClick={shareProfile} className="w-full text-left px-3 py-3 rounded-xl hover:bg-white/10">Share this profile</button>
              <button onClick={copyProfileUrl} className="w-full text-left px-3 py-3 rounded-xl hover:bg-white/10">Copy URL</button>
              {currentUser?.id !== resolvedProfileId && (
                <>
                  <button onClick={() => setShowReportModal(true)} className="w-full text-left px-3 py-3 rounded-xl hover:bg-white/10">Report</button>
                  <button disabled={actionBusy} onClick={blockProfile} className="w-full text-left px-3 py-3 rounded-xl text-red-300 hover:bg-red-500/10 disabled:opacity-60">Block</button>
                </>
              )}
              <button onClick={() => setShowProfileMenu(false)} className="w-full text-left px-3 py-3 rounded-xl text-gray-400 hover:bg-white/10">Cancel</button>
            </div>
          </div>
        )}

        {showReportModal && (
          <div className="fixed inset-0 bg-black/75 z-50 flex items-end justify-center p-4" onClick={() => setShowReportModal(false)}>
            <div className="w-full max-w-[380px] rounded-2xl border border-white/10 bg-[#101010] p-4" onClick={(event) => event.stopPropagation()}>
              <div className="text-base font-semibold mb-3">Report Profile</div>
              <textarea
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                placeholder="Tell us what happened"
                rows={4}
                className="w-full rounded-xl bg-white/10 border border-white/20 p-3 text-sm resize-none"
              />
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button onClick={() => setShowReportModal(false)} className="py-2 rounded-xl bg-white/10 border border-white/15">Cancel</button>
                <button disabled={actionBusy || reportReason.trim().length < 5} onClick={submitReport} className="py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 font-semibold disabled:opacity-50">Submit</button>
              </div>
            </div>
          </div>
        )}

        {/* POWR TAB */}
        {tab === 'powr' && (
          <div className="px-6 py-4 space-y-6">

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur active:bg-white/10 transition-colors">
              <textarea
                value={newPowr}
                onChange={(e) => setNewPowr(e.target.value)}
                placeholder="Share something..."
                className="w-full mb-3 p-3 rounded-lg bg-white/10 border border-white/20 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white placeholder:text-gray-500 text-sm resize-none"
                rows={3}
              />
              <button
                onClick={createPowrPost}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg active:shadow-md text-white font-semibold rounded-lg transition-all"
              >
                Post
              </button>
            </div>

            {powrPosts.map(p => {
              const postComments = getPowrPostComments(p.id);
              const liked = hasPowrLiked(p.id);
              const lifted = hasPowrLifted(p.id);
              const liftCount = getPowrPostLifts(p.id);
              const author = getUserProfile(p.user_id);

              return (
                <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur space-y-4">
                  <div className="flex items-start gap-3">
                    {author?.avatar_url ? (
                      <Image
                        src={author.avatar_url}
                        alt={author.username}
                        width={40}
                        height={40}
                        unoptimized
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-white flex items-center gap-1">
                        {author?.username || (p.user_id === currentUser?.id ? 'You' : 'User')}
                        {isProfileVerified(author) && <VerificationBadge />}
                      </div>
                      <div className="text-xs text-gray-500">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-100 leading-relaxed">{p.content}</p>

                  <div className="flex gap-6 text-gray-400">
                    <button
                      onClick={() => togglePowrLike(p.id)}
                      className="flex items-center gap-2 text-sm hover:text-red-500 active:text-red-600 transition-colors group"
                    >
                      <span className={`text-lg ${liked ? 'text-red-500' : 'text-gray-500'}`}>
                        {liked ? '♥' : '♡'}
                      </span>
                      <span>{getPowrPostLikes(p.id)}</span>
                    </button>
                    <button className="flex items-center gap-2 text-sm hover:text-purple-500 active:text-purple-600 transition-colors">
                      <span className="text-lg">💬</span>
                      <span>{postComments.length}</span>
                    </button>
                    <button
                      onClick={() => togglePowrLift(p.id)}
                      className="flex items-center gap-2 text-sm hover:text-cyan-400 active:text-cyan-500 transition-colors"
                    >
                      <span className={`text-lg ${lifted ? 'text-cyan-300' : 'text-gray-500'}`}>↻</span>
                      <span>{liftCount}</span>
                    </button>
                  </div>

                  {liftCount > 0 && (
                    <div className="text-[11px] text-cyan-300">Lifted by {liftCount} {liftCount === 1 ? 'user' : 'users'}</div>
                  )}

                  {postComments.length > 0 && (
                    <div className="space-y-3 bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-xs font-semibold text-gray-400">Comments ({postComments.length})</p>
                      <div className="space-y-2">
                        {postComments.slice(0, 3).map((c: any) => {
                          const commentAuthor = getUserProfile(c.user_id);
                          return (
                            <div key={c.id} className="bg-white/5 rounded-lg p-2.5">
                              <div className="flex items-center gap-1 mb-1">
                                <b className="text-sm font-semibold text-white flex items-center gap-1">
                                  {commentAuthor?.username || (c.user_id === currentUser?.id ? 'You' : 'User')}
                                  {isProfileVerified(commentAuthor) && <VerificationBadge />}
                                </b>
                              </div>
                              <p className="text-sm text-gray-300">{c.content}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-white/10">
                    <input
                      value={replyInputs[p.id] || ''}
                      onChange={e =>
                        setReplyInputs((prev: any) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                      className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-purple-500 text-white text-sm placeholder:text-gray-500"
                      placeholder="Add a comment..."
                    />
                    <button
                      onClick={() => addPowrComment(p.id)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg active:shadow-md transition-all"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              );
            })}

          </div>
        )}

        {tab === 'likes' && (
          <div className="px-6 py-4 space-y-4">
            {likedPowrPosts.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-gray-400">
                No liked Powr posts yet.
              </div>
            )}

            {likedPowrPosts.map((post) => {
              const author = getUserProfile(post.user_id);
              return (
                <div key={post.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-sm font-semibold text-white flex items-center gap-1">
                    {author?.username || 'User'}
                    {isProfileVerified(author) && <VerificationBadge />}
                  </div>
                  <p className="mt-2 text-sm text-gray-200 leading-relaxed">{post.content}</p>
                  <div className="mt-3 text-xs text-gray-400">
                    ♥ {getPowrPostLikes(post.id)} · 💬 {getPowrPostComments(post.id).length} · ↻ {getPowrPostLifts(post.id)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'lifted' && (
          <div className="px-6 py-4 space-y-4">
            {liftedPowrPosts.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-gray-400">
                No lifted Powr posts yet.
              </div>
            )}

            {liftedPowrPosts.map((post) => {
              const author = getUserProfile(post.user_id);
              return (
                <div key={post.id} className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-wider text-cyan-300 mb-2">Lifted</div>
                  <div className="text-sm font-semibold text-white flex items-center gap-1">
                    {author?.username || 'User'}
                    {isProfileVerified(author) && <VerificationBadge />}
                  </div>
                  <p className="mt-2 text-sm text-gray-200 leading-relaxed">{post.content}</p>
                  <div className="mt-3 text-xs text-gray-400">
                    ♥ {getPowrPostLikes(post.id)} · 💬 {getPowrPostComments(post.id).length} · ↻ {getPowrPostLifts(post.id)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* AVATAR CROP MODAL */}
        {avatarCropOpen && avatarCropSource && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-[380px] bg-[#101010] border border-white/10 rounded-2xl p-4">
              <div className="text-sm font-semibold text-white mb-3">Adjust Profile Photo</div>
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black mb-3">
                <Image
                  src={avatarCropSource}
                  alt="Avatar crop preview"
                  fill
                  unoptimized
                  sizes="380px"
                  className="object-cover"
                  style={{ transform: `scale(${avatarZoom})` }}
                />
              </div>
              <div className="mb-4">
                <div className="text-[11px] text-gray-400 mb-1">Zoom</div>
                <input
                  type="range"
                  min={1}
                  max={2.5}
                  step={0.05}
                  value={avatarZoom}
                  onChange={(e) => setAvatarZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={cancelAvatarCrop}
                  className="py-2 rounded-xl bg-white/10 text-white border border-white/15"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAvatarCrop}
                  className="py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* POST VIEWER MODAL */}
        {activePost && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setActivePost(null)}
          >
            <div
              className="w-full max-w-[430px] bg-black rounded-2xl overflow-hidden relative"
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const activePostMedia = getPostMediaItems(activePost);
                const activePostComments = getGridPostComments(activePost.id);
                const activePostLiked = hasGridLiked(activePost.id);
                const activePostLikeCount = getGridPostLikes(activePost.id);

                return (
                  <>
              <button
                onClick={() => setActivePost(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-lg z-10 active:bg-white/40"
              >
                ×
              </button>
                    {activePostMedia.length > 1 ? (
                      <div
                        className="w-full overflow-x-auto snap-x snap-mandatory flex"
                        onScroll={(event) => {
                          const width = event.currentTarget.clientWidth;
                          if (!width) return;
                          const index = Math.round(event.currentTarget.scrollLeft / width);
                          setActiveMediaIndex(Math.max(0, Math.min(activePostMedia.length - 1, index)));
                        }}
                      >
                        {activePostMedia.map((url) => (
                          <div key={url} className="w-full shrink-0 snap-center">
                            <Image src={url} alt="Post media" width={1200} height={1200} unoptimized className="w-full max-h-[60vh] object-contain" />
                          </div>
                        ))}
                      </div>
                    ) : activePostMedia[0] ? (
                      isVideoUrl(activePostMedia[0]) ? (
                        <video
                          src={activePostMedia[0]}
                          className="w-full max-h-[60vh] object-contain"
                          controls
                          autoPlay
                          playsInline
                        />
                      ) : (
                        <Image src={activePostMedia[0]} alt="Post media" width={1200} height={1200} unoptimized className="w-full max-h-[60vh] object-contain" />
                      )
                    ) : null}

                    {activePostMedia.length > 1 && (
                      <div className="px-4 pt-3 text-center text-xs text-gray-400">
                        {activeMediaIndex + 1} / {activePostMedia.length} • Swipe to view
                      </div>
                    )}

                    {(activePost.content || activePostLikeCount > 0 || activePostComments.length > 0) && (
                      <div className="p-4 space-y-3 border-t border-white/10">
                        {activePost.content && (
                          <div className="text-white text-sm leading-relaxed">{activePost.content}</div>
                        )}

                        <div className="flex items-center gap-6 text-gray-300">
                          <button
                            onClick={() => toggleGridLike(activePost.id)}
                            className="flex items-center gap-2 text-sm active:opacity-75"
                          >
                            <span className={`text-lg ${activePostLiked ? 'text-red-500' : 'text-gray-400'}`}>
                              {activePostLiked ? '♥' : '♡'}
                            </span>
                            <span>{activePostLikeCount}</span>
                          </button>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="text-lg">💬</span>
                            <span>{activePostComments.length}</span>
                          </div>
                          <button
                            onClick={() => shareGridPost(activePost.id)}
                            className="flex items-center gap-2 text-sm text-gray-300 active:opacity-75"
                          >
                            <span className="text-base">↗</span>
                            <span>Share</span>
                          </button>
                        </div>

                        {activePostComments.length > 0 && (
                          <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3 max-h-44 overflow-y-auto">
                            {activePostComments.slice(0, 6).map((comment: any) => {
                              const commentAuthor = getUserProfile(comment.user_id);
                              return (
                                <div key={comment.id} className="text-sm">
                                  <span className="font-semibold text-white mr-1">
                                    {commentAuthor?.username || (comment.user_id === currentUser?.id ? 'You' : 'User')}
                                  </span>
                                  <span className="text-gray-300">{comment.content}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <input
                            value={gridCommentInputs[activePost.id] || ''}
                            onChange={e =>
                              setGridCommentInputs(prev => ({
                                ...prev,
                                [activePost.id]: e.target.value,
                              }))
                            }
                            placeholder="Add a comment..."
                            className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500"
                          />
                          <button
                            onClick={() => addGridComment(activePost.id)}
                            className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white active:opacity-80"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* CREATE MENU DROPDOWN */}
        {showCreateMenu && (
          <div className="fixed top-20 right-6 w-44 bg-gray-900 border border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur">
            <button
              onClick={() => {
                router.push('/create?type=grid');
                setShowCreateMenu(false);
              }}
              className="block w-full text-left px-4 py-3 hover:bg-white/10 active:bg-white/20 transition-colors"
            >
              Post (Grid)
            </button>
            <button
              onClick={() => {
                router.push('/create?type=powr');
                setShowCreateMenu(false);
              }}
              className="block w-full text-left px-4 py-3 hover:bg-white/10 active:bg-white/20 transition-colors border-t border-white/10"
            >
              Status (POWR)
            </button>
          </div>
        )}

      </div>
    </div>
  );
}