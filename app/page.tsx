'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { supabase, uploadPostMedia } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import PageWrapper from '../components/PageWrapper';
import VerificationBadge from '@/components/VerificationBadge';
import { playPreviewAudio, stopPreviewAudio } from '@/lib/previewAudio';
import { computeAlignmentScore, inferPostAttributesFromCaption } from '@/lib/alignmentEngine';
import { computeFinalAlignmentScore, getSoundAdaptiveWeight, updateSoundAdaptiveWeight } from '@/lib/adaptiveAlignment';

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  is_verified?: boolean;
  verified?: boolean;
};

type Post = {
  id: string;
  content: string;
  user_id: string;
  media_url?: string | null;
  media_urls?: string[] | string | null;
  created_at?: string;
  genre?: string | null;
  mood?: string | null;
  activity?: string | null;
  alignment_score?: number | null;
  sound_adaptive_weight?: number | null;

  // ✅ ADD THESE
  track_name?: string | null;
  artist_name?: string | null;
  sound_id?: string | null;
  audio_url?: string | null;
  sound_cover_url?: string | null;
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
  genre?: string | null;
  mood?: string | null;
  energy_level?: number | null;
  preview_url?: string | null;
  thumbnail_url?: string | null;
  bpm?: number | null;
};

type HomeChartRow = {
  rank: number;
  title: string;
  artist: string;
  sound_id: string | null;
  cover_url: string | null;
  preview_url: string | null;
};

type BreakoutRow = {
  sound_id: string;
  rank: number;
  title: string;
  cover_url: string | null;
};

type HomeRawChartRow = {
  sound_id: string | null;
  rank: number | null;
  sounds: {
    id: string | null;
    track_name: string | null;
    artist_name: string | null;
    title: string | null;
    artist: string | null;
    cover_url: string | null;
    thumbnail_url: string | null;
    preview_url: string | null;
  } | null;
};

type ChartRankRow = {
  sound_id: string | null;
  rank: number | null;
  movement?: string | null;
  updated_at?: string | null;
  lifecycle?: string | null;
};

type UserSoundUsageRow = {
  sound_id: string | null;
  created_at: string | null;
};

type BreakoutUsageRow = {
  sound_id: string | null;
  user_id: string | null;
  created_at: string | null;
  likes_count?: number | null;
  comments_count?: number | null;
};

type HomeChartSignal = {
  momentumLevel: 'high' | 'medium' | 'low';
  reason: string | null;
};

const movementSymbol = (movement: string | null) => {
  const normalized = (movement || '').trim().toLowerCase();
  const parsed = Number.parseInt(normalized.replace(/[^\\d+-]/g, ''), 10);

  if (normalized.includes('up') || parsed > 0) return '▲';
  if (normalized.includes('down') || parsed < 0) return '▼';
  return '—';
};

const movementDelta = (movement: string | null) => {
  const normalized = (movement || '').trim().toLowerCase();
  const parsed = Number.parseInt(normalized.replace(/[^\d+-]/g, ''), 10);
  const hasNumeric = !Number.isNaN(parsed);

  if (normalized.includes('up')) return Math.abs(hasNumeric ? parsed : 1);
  if (normalized.includes('down')) return -Math.abs(hasNumeric ? parsed : 1);
  if (hasNumeric) return parsed;
  return 0;
};

const movementBadge = (movement: string | null, lifecycle: string | null | undefined) => {
  const isNew = (lifecycle || '').trim().toLowerCase() === 'birth';
  const delta = movementDelta(movement);

  if (isNew) return { text: '• NEW', tone: 'text-zinc-300' };
  if (delta > 0) return { text: `▲ +${delta}`, tone: 'text-emerald-400' };
  if (delta < 0) return { text: `▼ ${delta}`, tone: 'text-rose-400' };
  return { text: '• NEW', tone: 'text-zinc-400' };
};

const momentumToken = (level: 'high' | 'medium' | 'low') => {
  if (level === 'high') return '🔥';
  if (level === 'medium') return '⚡';
  return '•';
};

const momentumTone = (level: 'high' | 'medium' | 'low') => {
  if (level === 'high') return 'text-orange-300';
  if (level === 'medium') return 'text-amber-200';
  return 'text-zinc-500';
};

const chartContextLabel = (rank: number, movement: string | null, lifecycle: string | null | undefined) => {
  if ((lifecycle || '').trim().toLowerCase() === 'birth') return 'New this week';
  if (movementDelta(movement) > 2) return 'Fast rising';
  if (rank === 1) return 'Dominating this week';
  return null;
};

const lifecycleLabel = (lifecycle: string | null | undefined) => {
  const normalized = (lifecycle || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'birth') return 'new';
  if (normalized === 'rising') return 'rising';
  if (normalized === 'peak') return 'peak';
  if (normalized === 'declining') return 'declining';
  return '';
};

const canHoverPreview = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
};

const parseMediaUrlCandidates = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
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

    return [trimmed];
  }

  return [];
};

const resolvePostPrimaryMediaUrl = (post: Post): string => {
  const candidates = [
    ...parseMediaUrlCandidates(post.media_urls),
    ...parseMediaUrlCandidates(post.media_url),
  ];

  return candidates[0] || '';
};

const BREAKOUT_THRESHOLD = 2;

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
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(true);
  const [profileSearch, setProfileSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activePowerPost, setActivePowerPost] = useState<Post | null>(null);
  const [trendingTracks, setTrendingTracks] = useState<Sound[]>([]);
  const [upcomingTracks, setUpcomingTracks] = useState<Sound[]>([]);
  const [homeCharts, setHomeCharts] = useState<HomeChartRow[]>([]);
  const [breakouts, setBreakouts] = useState<BreakoutRow[]>([]);
  const [homeChartSignals, setHomeChartSignals] = useState<Record<string, HomeChartSignal>>({});
  const [homeTrendingRows, setHomeTrendingRows] = useState<HomeChartRow[]>([]);
  const [chartRankBySoundId, setChartRankBySoundId] = useState<Record<string, number>>({});
  const [chartLifecycleBySoundId, setChartLifecycleBySoundId] = useState<Record<string, string>>({});
  const [chartMovementBySoundId, setChartMovementBySoundId] = useState<Record<string, string>>({});
  const [userChartImpactBySoundId, setUserChartImpactBySoundId] = useState<Record<string, number>>({});

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
  const searchParams = useSearchParams();
  const handledDeepLinkRef = useRef<string | null>(null);

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

  const fetchData = useCallback(async () => {
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
      { data: chartsData },
      { data: chartRankData },
      { data: userSoundUsageData },
      { data: breakoutBaseData },
      { data: followingData },
      { data: savedPostsData },
    ] = await Promise.all([
      (async () => {
        const withMediaUrls = await supabase
          .from('posts')
          .select('id, content, user_id, media_url, media_urls, created_at, track_name, artist_name, sound_id, genre, mood, activity, alignment_score')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!withMediaUrls.error) return withMediaUrls;

        const missingMediaUrlsColumn = /media_urls/i.test(withMediaUrls.error.message || '');
        if (!missingMediaUrlsColumn) return withMediaUrls;

        return supabase
          .from('posts')
          .select('id, content, user_id, media_url, created_at, track_name, artist_name, sound_id, genre, mood, activity, alignment_score')
          .order('created_at', { ascending: false })
          .limit(50);
      })(),
      supabase
        .from('profiles')
        .select('id, username, avatar_url, verified, is_verified'),
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
        .select('id, track_name, artist_name, thumbnail_url, bpm, preview_url, genre, mood, energy_level')
        .order('usage_count', { ascending: false })
        .limit(10),
      supabase
        .from('sounds')
        .select('id, track_name, artist_name, thumbnail_url, bpm, preview_url, genre, mood, energy_level')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('chart_scores')
        .select(`
          sound_id,
          rank,
          sounds (
            id,
            track_name,
            artist_name,
            title,
            artist,
            cover_url,
            thumbnail_url,
            preview_url
          )
        `)
        .order('rank', { ascending: true })
        .limit(5),
      supabase
        .from('chart_scores')
        .select('sound_id, rank, movement, lifecycle, updated_at')
        .not('sound_id', 'is', null),
      supabase
        .from('posts')
        .select('sound_id, created_at')
        .eq('user_id', currentUser.id)
        .not('sound_id', 'is', null),
      supabase
        .from('chart_scores')
        .select(`
          sound_id,
          rank,
          sounds (
            id,
            track_name,
            artist_name,
            title,
            artist,
            cover_url,
            thumbnail_url,
            preview_url
          )
        `)
        .order('rank', { ascending: true })
        .limit(20),
      supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUser.id),
      supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', currentUser.id),
    ]);

    setProfiles(profilesData || []);
    setComments(commentsData || []);
    setLikes(likesData || []);
    setLifts((liftsData as Lift[]) || []);
    setActivities(activityData || []);
    setFollowingIds(((followingData || []) as { following_id: string }[]).map((item) => item.following_id));
    setSavedPostIds(
      ((savedPostsData || []) as { post_id: string | null }[])
        .map((item) => item.post_id)
        .filter((item): item is string => Boolean(item))
    );
    setTrendingTracks((trendingData as Sound[]) || []);
    setUpcomingTracks((upcomingData as Sound[]) || []);
    setHomeCharts(
      (((chartsData as unknown) as HomeRawChartRow[] | null) || []).map((row) => ({
        sound_id: row.sound_id ?? null,
        rank: row.rank ?? 0,
        title: row.sounds?.track_name ?? row.sounds?.title ?? '',
        artist: row.sounds?.artist_name ?? row.sounds?.artist ?? '',
        cover_url: row.sounds?.cover_url ?? row.sounds?.thumbnail_url ?? null,
        preview_url: row.sounds?.preview_url ?? null,
      }))
    );
    setChartRankBySoundId(
      (((chartRankData as unknown) as ChartRankRow[] | null) || []).reduce<Record<string, number>>((acc, row) => {
        if (!row.sound_id || typeof row.rank !== 'number') return acc;
        if (row.rank < 1 || row.rank > 20) return acc;
        acc[row.sound_id] = row.rank;
        return acc;
      }, {})
    );
    setChartLifecycleBySoundId(
      (((chartRankData as unknown) as ChartRankRow[] | null) || []).reduce<Record<string, string>>((acc, row) => {
        if (!row.sound_id || !row.lifecycle) return acc;
        acc[row.sound_id] = row.lifecycle;
        return acc;
      }, {})
    );
    setChartMovementBySoundId(
      (((chartRankData as unknown) as ChartRankRow[] | null) || []).reduce<Record<string, string>>((acc, row) => {
        if (!row.sound_id || !row.movement) return acc;
        acc[row.sound_id] = row.movement;
        return acc;
      }, {})
    );

    const chartMovementMapLocal = (((chartRankData as unknown) as ChartRankRow[] | null) || []).reduce<Record<string, string>>((acc, row) => {
      if (!row.sound_id || !row.movement) return acc;
      acc[row.sound_id] = row.movement;
      return acc;
    }, {});

    const breakoutBaseRows = (((breakoutBaseData as unknown) as HomeRawChartRow[] | null) || []);
    const breakoutSoundIds = breakoutBaseRows.map((row) => row.sound_id).filter((id): id is string => Boolean(id));

    if (breakoutSoundIds.length > 0) {
      const since14Iso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const since7Ms = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime();

      const [{ data: breakoutUsageRows }, { data: breakoutHistoryRows }] = await Promise.all([
        supabase
          .from('posts')
          .select('sound_id, user_id, created_at, likes_count, comments_count')
          .in('sound_id', breakoutSoundIds)
          .gte('created_at', since14Iso),
        supabase
          .from('chart_scores')
          .select('sound_id, rank, updated_at')
          .in('sound_id', breakoutSoundIds)
          .gte('updated_at', since14Iso)
          .not('updated_at', 'is', null),
      ]);

      const usageStats = (((breakoutUsageRows as unknown) as BreakoutUsageRow[] | null) || []).reduce<
        Record<string, { recent: number; previous: number; recent6h: number; prev6hAvg: number; uniqueRecentUsers: Set<string>; likes: number; comments: number; latestCreatedAt: string | null }>
      >((acc, row) => {
        if (!row.sound_id || !row.created_at) return acc;

        if (!acc[row.sound_id]) {
          acc[row.sound_id] = {
            recent: 0,
            previous: 0,
            recent6h: 0,
            prev6hAvg: 0,
            uniqueRecentUsers: new Set<string>(),
            likes: 0,
            comments: 0,
            latestCreatedAt: null,
          };
        }

        const ts = new Date(row.created_at).getTime();
        if (!Number.isFinite(ts)) return acc;

        acc[row.sound_id].likes += row.likes_count || 0;
        acc[row.sound_id].comments += row.comments_count || 0;
        if (!acc[row.sound_id].latestCreatedAt || ts > new Date(acc[row.sound_id].latestCreatedAt || 0).getTime()) {
          acc[row.sound_id].latestCreatedAt = row.created_at;
        }

        if (ts >= since7Ms) {
          acc[row.sound_id].recent += 1;
          if (row.user_id) acc[row.sound_id].uniqueRecentUsers.add(row.user_id);
        } else {
          acc[row.sound_id].previous += 1;
        }

        if (ts >= Date.now() - 6 * 60 * 60 * 1000) {
          acc[row.sound_id].recent6h += 1;
        }

        return acc;
      }, {});

      Object.keys(usageStats).forEach((soundId) => {
        const total24 = usageStats[soundId].recent + usageStats[soundId].previous;
        const prevWindow = Math.max(0, total24 - usageStats[soundId].recent6h);
        usageStats[soundId].prev6hAvg = prevWindow / 3;
      });

      const rankHistoryBySoundId = (((breakoutHistoryRows as unknown) as ChartRankRow[] | null) || []).reduce<
        Record<string, ChartRankRow[]>
      >((acc, row) => {
        if (!row.sound_id || typeof row.rank !== 'number' || !row.updated_at) return acc;
        if (!acc[row.sound_id]) acc[row.sound_id] = [];
        acc[row.sound_id].push(row);
        return acc;
      }, {});

      const breakoutCandidates = breakoutBaseRows
        .filter((row) => typeof row.rank === 'number' && row.rank > 5 && !!row.sound_id)
        .map((row) => {
          const soundId = row.sound_id as string;
          const currentRank = row.rank as number;
          const usage = usageStats[soundId];
          const velocity = usage ? Math.max(0, usage.recent - usage.previous) : 0;
          const uniqueUsers = usage ? usage.uniqueRecentUsers.size : 0;

          const history = (rankHistoryBySoundId[soundId] || []).slice().sort((a, b) => {
            return new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime();
          });
          const previousRank = history.length > 0 ? history[0].rank ?? currentRank : currentRank;
          const rankGain = Math.max(0, previousRank - currentRank);

          const spike2x = usage ? usage.recent6h >= Math.max(2, usage.prev6hAvg * 2) : false;
          const movementDeltaValue = row.sound_id ? movementDelta(chartMovementMapLocal[row.sound_id] || null) : 0;
          const breakoutScore = velocity * 0.4 + uniqueUsers * 0.3 + rankGain * 0.3;
          const isBreakout = movementDeltaValue >= 5 || spike2x;

          return {
            sound_id: soundId,
            rank: currentRank,
            title: row.sounds?.track_name ?? row.sounds?.title ?? '',
            cover_url: row.sounds?.cover_url ?? row.sounds?.thumbnail_url ?? null,
            breakoutScore,
            isBreakout,
          };
        })
        .filter((row) => row.isBreakout || row.breakoutScore >= BREAKOUT_THRESHOLD)
        .sort((a, b) => b.breakoutScore - a.breakoutScore)
        .slice(0, 3)
        .map((row) => ({
          sound_id: row.sound_id,
          rank: row.rank,
          title: row.title,
          cover_url: row.cover_url,
        }));

      setBreakouts(breakoutCandidates);

      const nextSignals = breakoutBaseRows.reduce<Record<string, HomeChartSignal>>((acc, row) => {
        if (!row.sound_id) return acc;
        const usage = usageStats[row.sound_id];
        const latestMs = usage?.latestCreatedAt ? new Date(usage.latestCreatedAt).getTime() : 0;
        const momentumLevel: 'high' | 'medium' | 'low' = latestMs >= Date.now() - 2 * 60 * 60 * 1000
          ? 'high'
          : latestMs >= Date.now() - 24 * 60 * 60 * 1000
            ? 'medium'
            : 'low';

        let reason: string | null = null;
        if ((usage?.comments || 0) >= 8) reason = 'Driving conversations';
        else if ((usage?.recent || 0) >= 8) reason = 'Used across posts';
        else if (momentumLevel === 'high') reason = 'Blowing up now';

        acc[row.sound_id] = { momentumLevel, reason };
        return acc;
      }, {});
      setHomeChartSignals(nextSignals);

      const trendingNowRows = (((chartsData as unknown) as HomeRawChartRow[] | null) || [])
        .map((row) => ({
          sound_id: row.sound_id ?? null,
          rank: row.rank ?? 0,
          title: row.sounds?.track_name ?? row.sounds?.title ?? '',
          artist: row.sounds?.artist_name ?? row.sounds?.artist ?? '',
          cover_url: row.sounds?.cover_url ?? row.sounds?.thumbnail_url ?? null,
          preview_url: row.sounds?.preview_url ?? null,
          momentum: row.sound_id ? (nextSignals[row.sound_id]?.momentumLevel === 'high' ? 3 : nextSignals[row.sound_id]?.momentumLevel === 'medium' ? 2 : 1) : 0,
        }))
        .sort((a, b) => b.momentum - a.momentum)
        .slice(0, 5)
        .map(({ momentum, ...rest }) => {
          void momentum;
          return rest;
        });

      setHomeTrendingRows(trendingNowRows);
    } else {
      setBreakouts([]);
      setHomeChartSignals({});
      setHomeTrendingRows([]);
    }

    const usageRows = (((userSoundUsageData as unknown) as UserSoundUsageRow[] | null) || []);
    const usageBySoundId = usageRows.reduce<Record<string, string>>((acc, row) => {
      if (!row.sound_id || !row.created_at) return acc;
      const existing = acc[row.sound_id];
      if (!existing || new Date(row.created_at).getTime() < new Date(existing).getTime()) {
        acc[row.sound_id] = row.created_at;
      }
      return acc;
    }, {});

    const userSoundIds = Object.keys(usageBySoundId);
    if (userSoundIds.length > 0) {
      const { data: userChartHistoryRows } = await supabase
        .from('chart_scores')
        .select('sound_id, rank, updated_at')
        .in('sound_id', userSoundIds)
        .not('sound_id', 'is', null);

      const historyBySoundId = (((userChartHistoryRows as unknown) as ChartRankRow[] | null) || []).reduce<Record<string, ChartRankRow[]>>(
        (acc, row) => {
          if (!row.sound_id || typeof row.rank !== 'number') return acc;
          if (!acc[row.sound_id]) acc[row.sound_id] = [];
          acc[row.sound_id].push(row);
          return acc;
        },
        {}
      );

      const impactBySoundId = userSoundIds.reduce<Record<string, number>>((acc, soundId) => {
        const rows = (historyBySoundId[soundId] || []).slice().sort((a, b) => {
          const aTime = new Date(a.updated_at || 0).getTime();
          const bTime = new Date(b.updated_at || 0).getTime();
          return aTime - bTime;
        });

        if (rows.length === 0) return acc;

        const firstUsageAt = new Date(usageBySoundId[soundId]).getTime();
        const previousRows = rows.filter((row) => {
          const ts = new Date(row.updated_at || 0).getTime();
          return Number.isFinite(ts) && ts < firstUsageAt;
        });

        const previous = previousRows.length > 0 ? previousRows[previousRows.length - 1] : null;
        const current = rows[rows.length - 1];

        if (!previous || typeof previous.rank !== 'number' || typeof current.rank !== 'number') return acc;

        const impact = previous.rank - current.rank;
        if (impact > 0) {
          acc[soundId] = impact;
        }
        return acc;
      }, {});

      setUserChartImpactBySoundId(impactBySoundId);
    } else {
      setUserChartImpactBySoundId({});
    }

    const ids = saved?.map((s: { sound_id: string }) => s.sound_id) || [];

    const postSoundIds = (postsData || [])
      .map((post) => post.sound_id)
      .filter((id): id is string => Boolean(id));

    if (postSoundIds.length > 0) {
      const { data: postSounds } = await supabase
        .from('sounds')
        .select('id, preview_url, cover_url, thumbnail_url, adaptive_weight')
        .in('id', postSoundIds);

      const soundById = new Map(
        (postSounds || []).map((sound) => [
          sound.id,
          {
            preview_url: sound.preview_url || null,
            cover_url: sound.cover_url || sound.thumbnail_url || null,
            adaptive_weight: sound.adaptive_weight || 1,
          },
        ])
      );

      setPosts(
        ((postsData || []) as Post[]).map((post) => ({
          ...post,
          audio_url: post.sound_id ? (soundById.get(post.sound_id)?.preview_url ?? null) : null,
          sound_cover_url: post.sound_id ? (soundById.get(post.sound_id)?.cover_url ?? null) : null,
          sound_adaptive_weight: post.sound_id ? (soundById.get(post.sound_id)?.adaptive_weight ?? 1) : 1,
        }))
      );
    } else {
      setPosts((postsData || []) as Post[]);
    }

    if (ids.length > 0) {
      const { data: soundsData } = await supabase
        .from('sounds')
        .select('id, track_name, artist_name, thumbnail_url, bpm, preview_url, genre, mood, energy_level')
        .in('id', ids);
      setSavedSounds(soundsData || []);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) void fetchData();
  }, [currentUser, fetchData]);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('home-posts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        void fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, fetchData]);

  const getProfile = (id: string) => profiles.find(p => p.id === id);
  const isProfileVerified = (profile: Profile | undefined) => Boolean(profile?.is_verified ?? profile?.verified);
  const getVerificationLevel = (profile?: Profile) => {
    if (!profile) return null;
    if (profile.verified) return 'priority' as const;
    if (profile.is_verified) return 'verified' as const;
    return null;
  };
  const getLikes = (postId: string) => likes.filter(l => l.post_id === postId);
  const getLifts = (postId: string) => lifts.filter((l) => l.post_id === postId);
  const getComments = (postId: string) => comments.filter((c) => c.post_id === postId);
  const hasLiked = (postId: string) =>
    likes.some(l => l.post_id === postId && l.user_id === currentUser?.id);
  const hasLifted = (postId: string) =>
    lifts.some((l) => l.post_id === postId && l.user_id === currentUser?.id);
  const isPostSaved = (postId: string) => savedPostIds.includes(postId);

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


  const getPostScore = useCallback((post: Post) => {
    const likeCount = likes.filter(l => l.post_id === post.id).length;
    const commentCount = comments.filter(c => c.post_id === post.id).length;
    const liftCount = lifts.filter((l) => l.post_id === post.id).length;

    let score = likeCount * 2 + commentCount * 3 + liftCount * 5;
    score += (post.alignment_score || 0) * (post.sound_adaptive_weight || 1);

    if (post.created_at) {
      const createdMs = new Date(post.created_at).getTime();
      if (Number.isFinite(createdMs)) {
        score += 1;
      }
    }

    if (post.sound_id) {
      const chartRank = chartRankBySoundId[post.sound_id];
      if (typeof chartRank === 'number' && chartRank >= 1 && chartRank <= 20) {
        const boostMultiplier = 1 + ((21 - chartRank) / 20) * 0.5;
        score *= boostMultiplier;
      }
    }

    return score;
  }, [likes, comments, lifts, chartRankBySoundId]);

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => getPostScore(b) - getPostScore(a)),
    [posts, getPostScore]
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
    () => sortedPosts.filter((post) => !!resolvePostPrimaryMediaUrl(post) && !hiddenPostIds.includes(post.id)).slice(0, 12),
    [sortedPosts, hiddenPostIds]
  );

  const powerFeedPosts = useMemo(
    () => sortedPosts.filter((post) => !resolvePostPrimaryMediaUrl(post) && !!post.content?.trim() && !hiddenPostIds.includes(post.id)).slice(0, 12),
    [sortedPosts, hiddenPostIds]
  );

  const hasMusicTracks = useMemo(
    () => trendingTracks.length > 0 || upcomingTracks.length > 0,
    [trendingTracks, upcomingTracks]
  );

  const breakoutSoundIdSet = useMemo(
    () => new Set(breakouts.map((item) => item.sound_id)),
    [breakouts]
  );

  const topChart = homeCharts[0] || null;
  const secondaryCharts = homeCharts.slice(1, 5);
  const recommendedCreateSounds = useMemo(() => {
    const merged = [...homeTrendingRows, ...homeCharts]
      .filter((row) => row.sound_id)
      .reduce<HomeChartRow[]>((acc, row) => {
        if (!row.sound_id) return acc;
        if (acc.some((item) => item.sound_id === row.sound_id)) return acc;
        acc.push(row);
        return acc;
      }, [])
      .slice(0, 6);

    return merged;
  }, [homeCharts, homeTrendingRows]);

  useEffect(() => {
    const targetPostId = searchParams.get('post');
    if (!targetPostId || handledDeepLinkRef.current === targetPostId) return;

    const targetPost = powerFeedPosts.find((post) => post.id === targetPostId);
    if (!targetPost) return;

    handledDeepLinkRef.current = targetPostId;
    setActivePowerPost(targetPost);
  }, [searchParams, powerFeedPosts]);

  const isVideoMedia = (url: string) => /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);

  const railClass =
    'flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

  const openTrack = (track: Sound) => {
    void playPreviewAudio(`sound:${track.id}`, track.preview_url);

    router.push(`/sound/${track.id}`);
  };

  const openCreateWithSound = (row: HomeChartRow) => {
    const params = new URLSearchParams();
    if (row.sound_id) params.set('soundId', row.sound_id);
    if (row.title) params.set('track', row.title);
    if (row.artist) params.set('artist', row.artist);
    router.push(`/create?${params.toString()}`);
  };

  const createPost = async () => {
  if (!currentUser || posting) return;
  if (!newPostContent && !file) return;

  setPosting(true);

  let mediaUrl: string | null = null;

  if (file) {
    mediaUrl = await uploadPostMedia(file, currentUser.id);
  }

  let soundId = null;
  let selectedSoundMeta: { genre?: string | null; mood?: string | null; energy_level?: number | null; adaptive_weight?: number | null } | null = null;

  if (trackName) {
    const { data: existing } = await supabase
      .from('sounds')
      .select('*')
      .eq('track_name', trackName)
      .eq('artist_name', artistName)
      .single();

    if (existing) {
      soundId = existing.id;
      selectedSoundMeta = {
        genre: existing.genre || null,
        mood: existing.mood || null,
        energy_level: existing.energy_level || null,
        adaptive_weight: existing.adaptive_weight || 1,
      };

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
      selectedSoundMeta = {
        genre: newSound.genre || null,
        mood: newSound.mood || null,
        energy_level: newSound.energy_level || null,
        adaptive_weight: newSound.adaptive_weight || 1,
      };
    }
  }

  const inferred = inferPostAttributesFromCaption(newPostContent || '');
  const resolvedMood = inferred.mood || null;
  const resolvedActivity = inferred.activity || null;
  const alignmentScore = computeAlignmentScore(
    {
      genre: null,
      mood: resolvedMood,
      activity: resolvedActivity,
    },
    {
      genre: selectedSoundMeta?.genre || null,
      mood: selectedSoundMeta?.mood || null,
      energy_level: selectedSoundMeta?.energy_level || null,
    }
  );

  const adaptiveWeight = soundId
    ? await getSoundAdaptiveWeight(supabase as any, soundId)
    : (selectedSoundMeta?.adaptive_weight || 1);
  const finalAlignmentScore = computeFinalAlignmentScore(alignmentScore, adaptiveWeight);

  await supabase.from('posts').insert({
    content: newPostContent,
    user_id: currentUser.id,
    media_url: mediaUrl,
    track_name: trackName,
    artist_name: artistName,
    sound_id: soundId,
    mood: resolvedMood,
    activity: resolvedActivity,
    alignment_score: finalAlignmentScore,
    likes_count: 0,
    comments_count: 0,
    lifts_count: 0,
  });

  if (soundId) {
    await updateSoundAdaptiveWeight(supabase as any, soundId);
  }

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

  const toggleSavePost = async (post: Post) => {
    if (!currentUser) return;

    if (savedPostIds.includes(post.id)) {
      await supabase
        .from('saved_posts')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('post_id', post.id);
    } else {
      await supabase
        .from('saved_posts')
        .insert({ user_id: currentUser.id, post_id: post.id });
      await track('save', post.id);
    }

    fetchData();
  };

  const withAuthFetch = async (url: string, options: RequestInit) => {
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
  };

  const hidePost = (postId: string) => {
    setHiddenPostIds((prev) => (prev.includes(postId) ? prev : [...prev, postId]));
    setMenuOpen(null);
  };

  const reportPost = async (postId: string) => {
    const reason = prompt('Report reason (min 5 chars):');
    if (!reason || reason.trim().length < 5) return;

    await withAuthFetch('/api/reports', {
      method: 'POST',
      body: JSON.stringify({ target_post_id: postId, reason: reason.trim() }),
    });

    setMenuOpen(null);
  };

  const blockUser = async (targetUserId: string) => {
    if (!currentUser || targetUserId === currentUser.id) return;

    await withAuthFetch('/api/blocks', {
      method: 'POST',
      body: JSON.stringify({ blocked_id: targetUserId }),
    });

    setHiddenPostIds((prev) => [...prev, ...posts.filter((post) => post.user_id === targetUserId).map((post) => post.id)]);
    setMenuOpen(null);
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!followingIds.includes(targetUserId)) return;

    await withAuthFetch(`/api/follows?following_id=${encodeURIComponent(targetUserId)}`, {
      method: 'DELETE',
    });

    setFollowingIds((prev) => prev.filter((id) => id !== targetUserId));
    setMenuOpen(null);
  };

  const deletePost = async (postId: string) => {
    if (!currentUser) return;
    const shouldDelete = confirm('Delete this post?');
    if (!shouldDelete) return;

    await supabase.from('posts').delete().eq('id', postId).eq('user_id', currentUser.id);
    setMenuOpen(null);
    fetchData();
  };

  const editPost = async (postId: string, content: string) => {
    const newContent = prompt('Edit post:', content);
    if (newContent === null) return;

    await supabase.from('posts').update({ content: newContent.trim() }).eq('id', postId);
    setMenuOpen(null);
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

  const closePowerPost = () => {
    setActivePowerPost(null);
    setMenuOpen(null);

    if (searchParams.get('post')) {
      router.replace('/');
    }
  };

  const renderHomeChartsModule = (className = '') => (
    <section className={className}>
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-[18px] font-bold text-white">RUEHL Charts</h2>
          <p className="mt-0.5 text-[11px] text-white/45">Live Ranking</p>
          <p className="mt-1 text-[12px] text-gray-500">Top 5 · This Week</p>
        </div>
        <button
          onClick={() => router.push('/charts')}
          className="text-[13px] text-gray-400 active:text-gray-200 transition-colors"
        >
          View Full Charts →
        </button>
      </div>

      <div className="space-y-3">
        {homeTrendingRows.length > 0 && (
          <div className="pb-2">
            <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-white/45">Trending Now</div>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {homeTrendingRows.map((item) => (
                <button
                  key={`home-trending-${item.sound_id || item.rank}`}
                  onClick={() => (item.sound_id ? router.push(`/sound/${item.sound_id}`) : router.push('/charts'))}
                  onMouseEnter={() => {
                    if (item.preview_url && canHoverPreview()) {
                      void playPreviewAudio(`home-trending:${item.sound_id || item.rank}`, item.preview_url);
                    }
                  }}
                  onMouseLeave={() => {
                    if (item.preview_url) stopPreviewAudio();
                  }}
                  className="min-w-[120px] shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-left transition-all md:hover:scale-[1.02] md:hover:bg-white/[0.06]"
                >
                  {item.cover_url && (
                    <Image src={item.cover_url} alt="" width={104} height={72} unoptimized className="h-14 w-full rounded-md object-cover" />
                  )}
                  <p className="mt-1 truncate text-[11px] font-semibold text-white/90">{item.title}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {recommendedCreateSounds.length > 0 && (
          <div className="pb-2">
            <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-cyan-200/80">Sounds You Should Use</div>
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {recommendedCreateSounds.map((row) => (
                <button
                  key={`home-create-${row.sound_id || row.rank}`}
                  type="button"
                  onClick={() => openCreateWithSound(row)}
                  className="shrink-0 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1.5 text-[11px] text-cyan-200"
                >
                  {row.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {homeCharts.length === 0 && <p className="text-[13px] text-gray-600">No chart activity yet</p>}
        {topChart && (
          <button
            key={topChart.rank + '-' + topChart.title + '-' + topChart.artist}
            onClick={() => (topChart.sound_id ? router.push(`/sound/${topChart.sound_id}`) : router.push('/charts'))}
            onMouseEnter={() => {
              if (topChart.preview_url && canHoverPreview()) {
                void playPreviewAudio(`home-chart:${topChart.sound_id || topChart.rank}`, topChart.preview_url);
              }
            }}
            onMouseLeave={() => {
              if (topChart.preview_url) {
                stopPreviewAudio();
              }
            }}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-4 text-left transition-all active:opacity-80 md:hover:scale-[1.015] md:hover:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 shrink-0 text-[28px] font-black leading-none tracking-tight text-white">#{topChart.rank}</span>
              {topChart.cover_url && (
                <Image src={topChart.cover_url} alt="" width={56} height={56} unoptimized className="h-14 w-14 rounded-md object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[26px] font-black leading-[1.02] text-white">{topChart.title}</p>
                <p className="truncate text-[13px] text-white/58">{topChart.artist}</p>
                {chartContextLabel(topChart.rank, chartMovementBySoundId[topChart.sound_id || ''] || null, chartLifecycleBySoundId[topChart.sound_id || '']) && (
                  <p className="mt-1 text-[11px] text-white/62">
                    {chartContextLabel(topChart.rank, chartMovementBySoundId[topChart.sound_id || ''] || null, chartLifecycleBySoundId[topChart.sound_id || ''])}
                  </p>
                )}
                {topChart.sound_id && homeChartSignals[topChart.sound_id]?.reason && (
                  <p className="mt-1 text-[11px] text-zinc-400">{homeChartSignals[topChart.sound_id]?.reason}</p>
                )}
                {topChart.sound_id && userChartImpactBySoundId[topChart.sound_id] > 0 && (
                  <p className="mt-1 text-[11px] text-cyan-300">You contributed to this trend</p>
                )}
              </div>
              <div className="w-20 shrink-0 text-right">
                <span className={[
                  'text-sm font-semibold tracking-wide',
                  movementBadge(chartMovementBySoundId[topChart.sound_id || ''] || null, chartLifecycleBySoundId[topChart.sound_id || '']).tone,
                ].join(' ')}>
                  {movementBadge(chartMovementBySoundId[topChart.sound_id || ''] || null, chartLifecycleBySoundId[topChart.sound_id || '']).text} <span className={momentumTone(homeChartSignals[topChart.sound_id || '']?.momentumLevel || 'low')}>{momentumToken(homeChartSignals[topChart.sound_id || '']?.momentumLevel || 'low')}</span>
                </span>
              </div>
            </div>
          </button>
        )}

        {secondaryCharts.length > 0 && (
          <div className="space-y-2 pt-2">
            {secondaryCharts.map((item) => (
              <button
                key={item.rank + '-' + item.title + '-' + item.artist}
                onClick={() => (item.sound_id ? router.push(`/sound/${item.sound_id}`) : router.push('/charts'))}
                onMouseEnter={() => {
                  if (item.preview_url && canHoverPreview()) {
                    void playPreviewAudio(`home-chart:${item.sound_id || item.rank}`, item.preview_url);
                  }
                }}
                onMouseLeave={() => {
                  if (item.preview_url) {
                    stopPreviewAudio();
                  }
                }}
                className="w-full rounded-xl border-b border-white/10 px-3 py-3 text-left transition-all active:opacity-80 md:hover:scale-[1.01] md:hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 shrink-0 text-[22px] font-black leading-none tracking-tight text-white/90">#{item.rank}</span>
                  {item.cover_url && (
                    <Image src={item.cover_url} alt="" width={48} height={48} unoptimized className="h-12 w-12 rounded-md object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-bold text-white/90">{item.title}</p>
                    <p className="truncate text-[12px] text-white/55">{item.artist}</p>
                    {chartContextLabel(item.rank, chartMovementBySoundId[item.sound_id || ''] || null, chartLifecycleBySoundId[item.sound_id || '']) && (
                      <p className="mt-1 text-[11px] text-white/58">
                        {chartContextLabel(item.rank, chartMovementBySoundId[item.sound_id || ''] || null, chartLifecycleBySoundId[item.sound_id || ''])}
                      </p>
                    )}
                    {item.sound_id && homeChartSignals[item.sound_id]?.reason && (
                      <p className="mt-1 text-[11px] text-zinc-400">{homeChartSignals[item.sound_id]?.reason}</p>
                    )}
                    {item.sound_id && userChartImpactBySoundId[item.sound_id] > 0 && (
                      <p className="mt-1 text-[11px] text-cyan-300">You contributed to this trend</p>
                    )}
                  </div>
                  <div className="w-20 shrink-0 text-right">
                    <span className={[
                      'text-sm font-semibold tracking-wide',
                      movementBadge(chartMovementBySoundId[item.sound_id || ''] || null, chartLifecycleBySoundId[item.sound_id || '']).tone,
                    ].join(' ')}>
                      {movementBadge(chartMovementBySoundId[item.sound_id || ''] || null, chartLifecycleBySoundId[item.sound_id || '']).text} <span className={momentumTone(homeChartSignals[item.sound_id || '']?.momentumLevel || 'low')}>{momentumToken(homeChartSignals[item.sound_id || '']?.momentumLevel || 'low')}</span>
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );

  const renderBreakoutsModule = (className = '') => (
    <section className={className}>
      <div className="mb-3">
        <h2 className="text-[18px] font-bold text-white">Breakouts</h2>
      </div>

      <div className="space-y-1.5">
        {breakouts.length === 0 && <p className="text-[13px] text-gray-600">No breakouts yet</p>}
        {breakouts.map((item) => (
          <button
            key={item.sound_id + '-' + item.rank}
            onClick={() => router.push(`/sound/${item.sound_id}`)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-2 text-left active:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-2">
              {item.cover_url && <Image src={item.cover_url} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-md object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-white/86">{item.title}</p>
                <p className="text-[11px] text-amber-300">Breakout</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-[600px] pb-36 px-4 lg:px-0">

        <div className="px-0 pt-6 lg:px-0">
          <div className="space-y-8 lg:min-w-0">

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
                const verified = isProfileVerified(user);
                const mediaUrl = resolvePostPrimaryMediaUrl(post);
                const likeCount = getLikes(post.id).length;
                const commentCount = getComments(post.id).length;
                const liftCount = getLifts(post.id).length;
                const liked = hasLiked(post.id);
                const lifted = hasLifted(post.id);
                const savedPost = isPostSaved(post.id);
                const isOwner = post.user_id === currentUser?.id;
                const chartRank = post.sound_id ? chartRankBySoundId[post.sound_id] : undefined;
                const lifecycle = post.sound_id ? chartLifecycleBySoundId[post.sound_id] : undefined;
                const movement = post.sound_id ? chartMovementBySoundId[post.sound_id] : undefined;
                const isRising = Boolean(
                  (lifecycle || '').toLowerCase() === 'rising' ||
                    (post.sound_id && breakoutSoundIdSet.has(post.sound_id))
                );
                const lifecycleToken = lifecycleLabel(lifecycle);
                const movementToken = movementSymbol(movement || null);
                if (!mediaUrl) return null;
                return (
                  <div
                    key={post.id}
                    className="relative w-[75%] shrink-0 snap-center rounded-[20px] overflow-hidden border border-white/[0.06] bg-[#0E0E0E] active:scale-[0.97] transition-transform"
                    style={{ height: 440 }}
                  >
                    <button
                      type="button"
                      onClick={() => router.push('/now')}
                      className="absolute inset-0"
                      aria-label="Open now feed"
                    >
                      {isVideoMedia(mediaUrl) ? (
                        <video src={mediaUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                      ) : (
                        <Image src={mediaUrl} className="w-full h-full object-cover" alt="" fill unoptimized sizes="(max-width: 768px) 75vw, 33vw" />
                      )}
                    </button>
                    {/* Bottom fade gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                    {/* Top-left: username */}
                    <div className="absolute top-4 left-4 flex items-center gap-1.5">
                      <span className="text-[14px] font-bold text-white drop-shadow-sm">@{user?.username || 'user'}</span>
                      {verified && <VerificationBadge />}
                    </div>
                    <div className="absolute top-4 right-4 z-10">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuOpen((prev) => (prev === post.id ? null : post.id));
                        }}
                        className="text-white/85 text-sm"
                        aria-label="Post menu"
                      >
                        ...
                      </button>
                      {menuOpen === post.id && (
                        <div className="absolute right-0 top-6 z-20 w-40 rounded-xl border border-white/15 bg-black/95 p-1 text-xs text-white">
                          {isOwner ? (
                            <>
                              <button type="button" onClick={() => editPost(post.id, post.content || '')} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Edit</button>
                              <button type="button" onClick={() => deletePost(post.id)} className="block w-full rounded-lg px-3 py-2 text-left text-red-300 hover:bg-red-500/10">Delete</button>
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
                    {/* Bottom: caption + like count */}
                    <div className="absolute bottom-4 left-4 right-4 text-left">
                      {post.content && (
                        <p className="text-[13px] text-white/90 font-medium truncate mb-1.5">{post.content}</p>
                      )}

                      {post.track_name && post.artist_name && (
                        <button
                          type="button"
                          onClick={() => void playPreviewAudio(`post:${post.id}`, post.audio_url)}
                          onMouseEnter={() => {
                            if (canHoverPreview()) {
                              void playPreviewAudio(`post:${post.id}`, post.audio_url);
                            }
                          }}
                          className="mb-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[11px] text-white/90"
                        >
                          {post.sound_cover_url && (
                            <Image src={post.sound_cover_url} alt="" width={16} height={16} unoptimized className="h-4 w-4 rounded object-cover" />
                          )}
                          <span>🎵</span>
                          <span className="truncate">{post.track_name} - {post.artist_name}</span>
                        </button>
                      )}

                      {post.sound_id && (typeof chartRank === 'number' || isRising || lifecycleToken) && (
                        <p className="mb-1.5 text-[10px] text-white/52">
                          {lifecycleToken ? `${movementToken} ${lifecycleToken}` : movementToken}
                          {(typeof chartRank === 'number' || isRising) ? ' · ' : ''}
                          {typeof chartRank === 'number' ? `#${chartRank} this week` : ''}
                          {typeof chartRank === 'number' && isRising ? ' · ' : ''}
                          {isRising ? 'Rising fast' : ''}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/70">
                        <button type="button" onClick={() => void toggleLike(post)} className={liked ? 'text-red-300' : ''}> {liked ? 'Liked' : 'Like'} {likeCount}</button>
                        <button type="button" onClick={() => setActivePowerPost(post)}>Comment {commentCount}</button>
                        <button type="button" onClick={() => void toggleLift(post)} className={lifted ? 'text-cyan-300' : ''}>{lifted ? 'Lifted' : 'Lift'} {liftCount}</button>
                        <button type="button" onClick={() => void toggleSavePost(post)}>{savedPost ? 'Saved' : 'Save'}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── POWR THOUGHTS ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[18px] font-bold text-white">POWR Thoughts</h2>
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
                const verified = isProfileVerified(user);
                const heat = getLikes(post.id).length;
                const liftCount = getLifts(post.id).length;
                const commentCount = getComments(post.id).length;
                const lifted = hasLifted(post.id);
                const savedPost = isPostSaved(post.id);
                const isOwner = post.user_id === currentUser?.id;
                return (
                  <div
                    key={post.id}
                    className="w-[260px] shrink-0 snap-start rounded-2xl border border-white/[0.06] bg-[#111] p-3 text-left active:scale-[0.97] transition-transform flex flex-col justify-between"
                    style={{ height: 130 }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setActivePowerPost(post)}
                        className="flex-1 text-left"
                      >
                        <p className="text-[15px] font-semibold text-white leading-snug line-clamp-2">{post.content}</p>
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setMenuOpen((prev) => (prev === post.id ? null : post.id))}
                          className="text-xs text-white/80"
                          aria-label="Post menu"
                        >
                          ...
                        </button>
                        {menuOpen === post.id && (
                          <div className="absolute right-0 top-5 z-20 w-40 rounded-xl border border-white/15 bg-black/95 p-1 text-xs text-white">
                            {isOwner ? (
                              <>
                                <button type="button" onClick={() => editPost(post.id, post.content || '')} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Edit</button>
                                <button type="button" onClick={() => deletePost(post.id)} className="block w-full rounded-lg px-3 py-2 text-left text-red-300 hover:bg-red-500/10">Delete</button>
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
                    {verified && (
                      <div className="mt-1 text-[11px] text-white/70 inline-flex items-center">
                        @{user?.username || 'user'} <VerificationBadge />
                      </div>
                    )}
                    {post.track_name && post.artist_name && (
                      <button
                        type="button"
                        onClick={() => void playPreviewAudio(`post:${post.id}`, post.audio_url)}
                        onMouseEnter={() => {
                          if (canHoverPreview()) {
                            void playPreviewAudio(`post:${post.id}`, post.audio_url);
                          }
                        }}
                        className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/20 bg-black/45 px-2 py-0.5 text-[10px] text-white/85"
                      >
                        {post.sound_cover_url && (
                          <Image src={post.sound_cover_url} alt="" width={14} height={14} unoptimized className="h-3.5 w-3.5 rounded object-cover" />
                        )}
                        <span>🎵</span>
                        <span className="truncate">{post.track_name} - {post.artist_name}</span>
                      </button>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-gray-500">@{user?.username || 'user'}</span>
                      <div className="flex items-center gap-2 text-[11px] text-gray-300">
                        <button type="button" onClick={() => void toggleLike(post)} className={hasLiked(post.id) ? 'text-red-300' : ''}>{hasLiked(post.id) ? 'Liked' : 'Like'} {heat}</button>
                        <button type="button" onClick={() => setActivePowerPost(post)}>{`Comment ${commentCount}`}</button>
                        <button type="button" onClick={() => void toggleLift(post)} className={lifted ? 'text-cyan-300' : ''}>{lifted ? 'Lifted' : 'Lift'} {liftCount}</button>
                        <button type="button" onClick={() => void toggleSavePost(post)}>{savedPost ? 'Saved' : 'Save'}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── MUSIC ── */}
          {renderBreakoutsModule('lg:hidden')}
          {renderHomeChartsModule('lg:hidden')}

          {hasMusicTracks && (
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
                    <Image src={trendingTracks[0].thumbnail_url} className="w-full h-full object-cover" alt="" fill unoptimized sizes="(max-width: 1024px) 100vw, 40vw" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-pink-500" />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/20 pointer-events-none" />
                <div className="absolute inset-0 p-5 flex flex-col justify-end text-left">
                  <div className="text-[10px] font-bold tracking-[0.2em] text-[#39FF14] uppercase mb-1">Trending</div>
                  <div className="text-[18px] font-bold text-white leading-tight">{trendingTracks[0].track_name || 'Unknown Track'}</div>
                  <div className="text-[14px] text-gray-400 mt-0.5">{trendingTracks[0].artist_name || ''}</div>
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
                      <Image src={track.thumbnail_url} className="w-full h-full object-cover" alt="" width={80} height={80} unoptimized />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900" />
                    )}
                  </div>
                  <div className="mt-2 w-20">
                    <div className="text-[12px] font-semibold text-white truncate">{track.track_name || ''}</div>
                    <div className="text-[10px] text-gray-500 truncate">{track.artist_name || 'Unknown'}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
          )}


          </div>

          <aside className="hidden lg:block lg:sticky lg:top-20">
            <div className="mb-4 border-t border-white/10" />
            {renderBreakoutsModule('mb-8')}
            {renderHomeChartsModule()}
          </aside>

        </div>
      </div>

      {/* ── POWR POST MODAL ── */}
      {activePowerPost && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={closePowerPost}
        >
          <div
            className="w-full max-w-[400px] max-h-[85dvh] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-white/[0.08]">
              <div className="flex items-start justify-between gap-3 mb-4">
                <button
                  onClick={() => router.push(`/profile/${activePowerPost.user_id}`)}
                  className="text-[14px] font-semibold text-white active:text-purple-300 transition-colors inline-flex items-center gap-1"
                >
                  @{getProfile(activePowerPost.user_id)?.username || 'user'}
                  {isProfileVerified(getProfile(activePowerPost.user_id)) && <VerificationBadge />}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((prev) => (prev === activePowerPost.id ? null : activePowerPost.id))}
                    className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center text-sm"
                    aria-label="Post menu"
                  >
                    ...
                  </button>
                  <button
                    onClick={closePowerPost}
                    className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center text-lg active:scale-90 transition-transform"
                  >
                    ×
                  </button>
                </div>
              </div>

              {menuOpen === activePowerPost.id && (
                <div className="mb-3 rounded-xl border border-white/15 bg-black/60 p-1 text-xs text-white">
                  {activePowerPost.user_id === currentUser?.id ? (
                    <>
                      <button type="button" onClick={() => editPost(activePowerPost.id, activePowerPost.content || '')} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Edit</button>
                      <button type="button" onClick={() => deletePost(activePowerPost.id)} className="block w-full rounded-lg px-3 py-2 text-left text-red-300 hover:bg-red-500/10">Delete</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => void reportPost(activePowerPost.id)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Report</button>
                      <button type="button" onClick={() => void blockUser(activePowerPost.user_id)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Block</button>
                      <button type="button" onClick={() => hidePost(activePowerPost.id)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Hide</button>
                      {followingIds.includes(activePowerPost.user_id) && (
                        <button type="button" onClick={() => void unfollowUser(activePowerPost.user_id)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10">Unfollow</button>
                      )}
                    </>
                  )}
                </div>
              )}

              <p className="text-white text-[16px] leading-relaxed">{activePowerPost.content}</p>

              {activePowerPost.track_name && activePowerPost.artist_name && (
                <button
                  type="button"
                  onClick={() => void playPreviewAudio(`post:${activePowerPost.id}`, activePowerPost.audio_url || null)}
                  onMouseEnter={() => {
                    if (canHoverPreview()) {
                      void playPreviewAudio(`post:${activePowerPost.id}`, activePowerPost.audio_url || null);
                    }
                  }}
                  className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12px] text-white/90"
                >
                  {activePowerPost.sound_cover_url && (
                    <Image src={activePowerPost.sound_cover_url} alt="" width={16} height={16} unoptimized className="h-4 w-4 rounded object-cover" />
                  )}
                  <span>Sound</span>
                  <span className="truncate">{activePowerPost.track_name} - {activePowerPost.artist_name}</span>
                </button>
              )}

              <div className="mt-5 flex items-center gap-2">
                <button
                  onClick={() => toggleLike(activePowerPost)}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[14px] text-white active:scale-95 transition-transform"
                >
                  <span className={hasLiked(activePowerPost.id) ? 'text-red-300' : ''}>{hasLiked(activePowerPost.id) ? 'Liked' : 'Like'}</span>
                  <span>{getLikes(activePowerPost.id).length}</span>
                </button>

                <button
                  onClick={() => toggleLift(activePowerPost)}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[14px] text-white active:scale-95 transition-transform"
                >
                  <span className={hasLifted(activePowerPost.id) ? 'text-cyan-300' : ''}>{hasLifted(activePowerPost.id) ? 'Lifted' : 'Lift'}</span>
                  <span>{getLifts(activePowerPost.id).length}</span>
                </button>

                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[14px] text-white">
                  <span>Comment</span>
                  <span>{getComments(activePowerPost.id).length}</span>
                </div>

                <button
                  onClick={() => toggleSavePost(activePowerPost)}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[14px] text-white active:scale-95 transition-transform"
                >
                  <span>{isPostSaved(activePowerPost.id) ? 'Saved' : 'Save'}</span>
                </button>

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