'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import VerificationBadge from '@/components/VerificationBadge';
import type { SessionEnergy } from '@/lib/sessions/computeSessionAlignment';
import { getTopMatches, type MatchCandidate } from '@/lib/sessions/matchEngine';
import { getNearbyPlaces } from '@/lib/location/getNearbyPlaces';
import { getDistanceKm } from '@/lib/core/distance';
import { scoreToStage } from '@/lib/core/alignment';
import {
  formatWhen,
  normalizeLiveStatus,
  requestStatusToCanonical,
  statusToCanonical,
} from '@/lib/core/sessionsLogic';

type Profile = {
  id: string;
  username: string;
  avatar_url?: string | null;
  activity_type?: string | null;
  is_creator?: boolean | null;
  verified?: boolean | null;
  is_verified?: boolean | null;
  reliability_score?: number | null;
  sessions_completed?: number | null;
  rank_score?: number | null;
};

type TrainingSessionRow = {
  id: string;
  host_id: string | null;
  host_user_id?: string | null;
  intent: string | null;
  activity_type?: string | null;
  energy_level: SessionEnergy | null;
  location: string | null;
  lat: number | null;
  lng: number | null;
  scheduled_time: string | null;
  date_time?: string | null;
  status: string | null;
  visibility: 'PUBLIC' | 'REQUEST' | 'PRIVATE' | string | null;
  created_at: string | null;
};

type TrainingRequestRow = {
  id: string;
  session_id: string | null;
  requester_id: string | null;
  target_id?: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | string;
  created_at: string | null;
};

type RequestView = TrainingRequestRow & {
  session: TrainingSessionRow | null;
  requester: Profile | null;
  hostId: string | null;
  isIncoming: boolean;
};

type LiveSessionRow = {
  id: string;
  host_id: string;
  session_type: 'solo' | 'open';
  session_role: 'normal' | 'creator';
  training_type: string | null;
  nutrition_type: string | null;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  scheduled_time: string | null;
  created_at: string;
  lat: number | null;
  lng: number | null;
  note: string | null;
  host?: Profile | null;
};

type AlignmentStage = 'Early' | 'Developing' | 'Strong';

type AlignmentModel = {
  score: number;
  stage: AlignmentStage;
  progressMessage: string;
  metrics: {
    postsCount: number;
    sessionInteractions: number;
    engagementActivity: number;
  };
  rankingSignal: number;
  matchingSignal: number;
};

const normalize = (value: string | null | undefined) => (value || '').trim().toLowerCase();
const isVerified = (profile?: { verified?: boolean | null; is_verified?: boolean | null } | null) =>
  Boolean(profile?.verified || profile?.is_verified);

const deriveNutritionMode = (captions: string[]) => {
  const text = captions.join(' ').toLowerCase();
  if (!text.trim()) return 'Balanced';
  if (/cut|deficit|lean|shred/.test(text)) return 'Cutting';
  if (/bulk|surplus|mass|gain/.test(text)) return 'Bulking';
  if (/maintain|maintenance|recomp/.test(text)) return 'Maintenance';
  return 'Balanced';
};

const toTitleCase = (value: string | null | undefined, fallback: string) => {
  const normalized = (value || '').trim();
  if (!normalized) return fallback;
  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const toOneDecimal = (value: number) => Number(value.toFixed(1));

export default function SessionsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [recommendedMatches, setRecommendedMatches] = useState<MatchCandidate[]>([]);
  const [nearbyContextByUserId, setNearbyContextByUserId] = useState<Record<string, string>>({});
  const [liveSessions, setLiveSessions] = useState<LiveSessionRow[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [mySessions, setMySessions] = useState<TrainingSessionRow[]>([]);
  const [requests, setRequests] = useState<RequestView[]>([]);
  const [matchIdBySessionId, setMatchIdBySessionId] = useState<Record<string, string>>({});

  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickSessionType, setQuickSessionType] = useState<'solo' | 'open'>('open');
  const [hostAsCreatorSession, setHostAsCreatorSession] = useState(false);
  const [quickTimeOption, setQuickTimeOption] = useState<'now' | 'plus30' | 'custom'>('now');
  const [quickCustomTime, setQuickCustomTime] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [focusTraining, setFocusTraining] = useState('General');
  const [focusNutrition, setFocusNutrition] = useState('Balanced');
  const [alignmentLoading, setAlignmentLoading] = useState(true);
  const [alignmentBaseline, setAlignmentBaseline] = useState<number>(26);
  const [postsCount, setPostsCount] = useState(0);

  const availableSectionRef = useRef<HTMLElement | null>(null);

  const loadProfiles = useCallback(async () => {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, activity_type, is_creator, verified, is_verified, reliability_score, sessions_completed, rank_score')
      .limit(2000);

    const profiles = (profilesData || []) as Profile[];
    setAllProfiles(profiles);
    return profiles;
  }, []);

  const loadCurrentUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCurrentUserId(null);
      setCurrentProfile(null);
      return null;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, activity_type, is_creator, verified, is_verified, reliability_score, sessions_completed, rank_score')
      .eq('id', user.id)
      .maybeSingle();

    setCurrentUserId(user.id);
    setCurrentProfile((profileData as Profile | null) || null);

    const { data: recentPosts } = await supabase
      .from('posts')
      .select('content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const { count: postCount } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const captions = ((recentPosts || []) as Array<{ content?: string | null }>)
      .map((item) => (item.content || '').trim())
      .filter(Boolean);

    setFocusTraining(toTitleCase((profileData as Profile | null)?.activity_type, 'General'));
    setFocusNutrition(deriveNutritionMode(captions));
    setPostsCount(postCount || 0);
    setAlignmentBaseline(Math.floor(20 + Math.random() * 21));

    return {
      userId: user.id,
      profile: (profileData as Profile | null) || null,
    };
  }, []);

  const loadMySessions = useCallback(async (userId: string) => {
    const { data: sessionsData } = await supabase
      .from('training_sessions')
      .select('id, host_id, host_user_id, intent, activity_type, energy_level, location, lat, lng, scheduled_time, date_time, status, visibility, created_at')
      .or(`host_id.eq.${userId},host_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(150);

    setMySessions((sessionsData || []) as TrainingSessionRow[]);
  }, []);

  const loadLiveSessions = useCallback(async (priorityFollowingIds: string[] = []) => {
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('id, host_id, session_type, session_role, training_type, nutrition_type, status, scheduled_time, created_at, lat, lng, note')
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: false })
      .limit(40);

    const rows = ((sessionData || []) as Array<Record<string, any>>).map((row) => {
      const sessionRole: LiveSessionRow['session_role'] = row.session_role === 'creator' ? 'creator' : 'normal';

      return {
        id: row.id as string,
        host_id: row.host_id as string,
        session_type: ((row.session_type as string) === 'solo' ? 'solo' : 'open') as 'solo' | 'open',
        session_role: sessionRole,
        training_type: (row.training_type as string | null) || null,
        nutrition_type: (row.nutrition_type as string | null) || null,
        status: normalizeLiveStatus(row.status as string | null),
        scheduled_time: (row.scheduled_time as string | null) || null,
        created_at: (row.created_at as string) || new Date().toISOString(),
        lat: (row.lat as number | null) ?? null,
        lng: (row.lng as number | null) ?? null,
        note: (row.note as string | null) || null,
      };
    });

    const hostIds = Array.from(new Set(rows.map((row) => row.host_id).filter(Boolean)));
    const { data: hostProfiles } = hostIds.length
      ? await supabase
          .from('profiles')
          .select('id, username, avatar_url, is_creator, verified, is_verified')
          .in('id', hostIds)
      : { data: [] as Profile[] };

    const hostMap = new Map(((hostProfiles || []) as Profile[]).map((profile) => [profile.id, profile]));

    const enriched = rows.map((row) => ({
        ...row,
        host: hostMap.get(row.host_id) || null,
      }));

    enriched.sort((a, b) => {
      const aCreator = a.session_role === 'creator';
      const bCreator = b.session_role === 'creator';

      const aScore =
        (aCreator ? 1000 : 0) +
        (aCreator && priorityFollowingIds.includes(a.host_id) ? 400 : 0) +
        (a.status === 'active' ? 80 : 0) +
        new Date(a.created_at).getTime() / 1e12;
      const bScore =
        (bCreator ? 1000 : 0) +
        (bCreator && priorityFollowingIds.includes(b.host_id) ? 400 : 0) +
        (b.status === 'active' ? 80 : 0) +
        new Date(b.created_at).getTime() / 1e12;

      return bScore - aScore;
    });

    setLiveSessions(enriched);
  }, []);

  const loadFollowingIds = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .limit(3000);

    const ids = ((data || []) as Array<{ following_id: string }>).map((item) => item.following_id);

    setFollowingIds((prev) => {
      if (prev.length === ids.length && prev.every((value, index) => value === ids[index])) {
        return prev;
      }
      return ids;
    });

    return ids;
  }, []);

  const loadMatches = useCallback(async (userId: string, sessionIds: string[]) => {
    let query = supabase
      .from('training_matches')
      .select('id, session_id, user_a, user_b')
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .limit(300);

    if (sessionIds.length) {
      query = query.in('session_id', sessionIds);
    }

    const { data } = await query;

    const map = ((data || []) as Array<{ id: string; session_id?: string | null }>).reduce<Record<string, string>>(
      (acc, item) => {
        if (item.session_id) acc[item.session_id] = item.id;
        return acc;
      },
      {}
    );

    setMatchIdBySessionId(map);
  }, []);

  const loadRequests = useCallback(
    async (userId: string, profiles: Profile[]) => {
      const { data: requestData } = await supabase
        .from('training_requests')
        .select('id, session_id, requester_id, target_id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(300);

      const requests = ((requestData || []) as TrainingRequestRow[]).map((item) => ({
        ...item,
        status: requestStatusToCanonical(item.status),
      }));

      const sessionIds = Array.from(new Set(requests.map((item) => item.session_id).filter(Boolean))) as string[];

      const { data: sessionData } = sessionIds.length
        ? await supabase
            .from('training_sessions')
            .select('id, host_id, host_user_id, intent, activity_type, energy_level, location, lat, lng, scheduled_time, date_time, status, visibility, created_at')
            .in('id', sessionIds)
        : { data: [] as TrainingSessionRow[] };

      const sessionById = new Map(((sessionData || []) as TrainingSessionRow[]).map((row) => [row.id, row]));
      const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

      const mapped = requests
        .map((request): RequestView | null => {
          if (!request.session_id) return null;
          const session = sessionById.get(request.session_id) || null;
          const hostId = session?.host_id || session?.host_user_id || request.target_id || null;
          const requester = request.requester_id ? profileById.get(request.requester_id) || null : null;
          const isIncoming = Boolean(hostId && hostId === userId && request.requester_id !== userId);

          if (!isIncoming && request.requester_id !== userId) return null;

          return {
            ...request,
            session,
            requester,
            hostId,
            isIncoming,
          };
        })
        .filter((item): item is RequestView => Boolean(item));

      setRequests(mapped);
    },
    []
  );

  const loadRecommendedMatches = useCallback(async (userId: string) => {
    const matches = await getTopMatches(userId, {
      userLocation: location,
      limit: 10,
    });

    setRecommendedMatches(matches);
  }, [location]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setFeedback(null);

    const userContext = await loadCurrentUser();
    if (!userContext) {
      setLoading(false);
      return;
    }

    const profiles = await loadProfiles();
    const followedIds = await loadFollowingIds(userContext.userId);

    await Promise.all([
      loadRecommendedMatches(userContext.userId),
      loadLiveSessions(followedIds),
      loadMySessions(userContext.userId),
      loadRequests(userContext.userId, profiles),
    ]);

    const { data: mySessionRows } = await supabase
      .from('training_sessions')
      .select('id')
      .or(`host_id.eq.${userContext.userId},host_user_id.eq.${userContext.userId}`)
      .limit(200);

    const sessionIds = ((mySessionRows || []) as Array<{ id: string }>).map((row) => row.id);
    await loadMatches(userContext.userId, sessionIds);

    setLoading(false);
  }, [loadCurrentUser, loadProfiles, loadFollowingIds, loadRecommendedMatches, loadLiveSessions, loadMySessions, loadRequests, loadMatches]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => {
        setLocation(null);
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  }, []);

  useEffect(() => {
    if (recommendedMatches.length === 0) {
      setNearbyContextByUserId({});
      return;
    }

    let alive = true;

    const loadNearbyContext = async () => {
      const entries = await Promise.all(
        recommendedMatches.map(async (match) => {
          if (typeof match.lat !== 'number' || typeof match.lng !== 'number') {
            return [match.userId, 'Gym nearby'] as const;
          }

          const places = await getNearbyPlaces(match.lat, match.lng);
          if (places.length > 0) {
            return [match.userId, `Near ${places[0].name}`] as const;
          }

          return [match.userId, 'Gym nearby'] as const;
        })
      );

      if (!alive) return;
      setNearbyContextByUserId(Object.fromEntries(entries));
    };

    void loadNearbyContext();

    return () => {
      alive = false;
    };
  }, [recommendedMatches]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('sessions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'training_sessions' }, () => {
        void refreshAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'training_requests' }, () => {
        void refreshAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'training_matches' }, () => {
        void refreshAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        void refreshAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_participants' }, () => {
        void refreshAll();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, refreshAll]);

  useEffect(() => {
    if (!currentUserId) return;

    setAlignmentLoading(true);
    const timeoutMs = 2000 + Math.floor(Math.random() * 1000);
    const timer = window.setTimeout(() => {
      setAlignmentLoading(false);
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [currentUserId]);

  const requested = useMemo(() => requests.slice(0, 20), [requests]);

  const yourSessions = useMemo(
    () =>
      mySessions
        .map((session) => ({
          ...session,
          canonicalStatus: statusToCanonical(session.status),
          when: session.scheduled_time || session.date_time || session.created_at,
        }))
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()),
    [mySessions]
  );

  const alignmentModel = useMemo<AlignmentModel>(() => {
    const sessionInteractions = mySessions.length + requests.length;
    const engagementActivity =
      requests.filter((request) => request.status === 'ACCEPTED').length +
      mySessions.filter((session) => statusToCanonical(session.status) !== 'CANCELLED').length;

    const hasRealSignals = postsCount > 0 || sessionInteractions > 0 || engagementActivity > 0;
    const computedScore = clamp(
      Math.round(postsCount * 1.8 + sessionInteractions * 4.2 + engagementActivity * 3.4),
      0,
      100
    );
    const score = hasRealSignals ? computedScore : alignmentBaseline;
    const stage = scoreToStage(score);

    return {
      score,
      stage,
      progressMessage: 'Your alignment improves with activity',
      metrics: {
        postsCount,
        sessionInteractions,
        engagementActivity,
      },
      rankingSignal: clamp(score / 100, 0, 1),
      matchingSignal: clamp((score + engagementActivity) / 110, 0, 1),
    };
  }, [mySessions, requests, postsCount, alignmentBaseline]);

  const respondRequest = async (request: RequestView, accept: boolean) => {
    if (!currentUserId || !request.session_id || !request.requester_id || busyActionId) return;

    setBusyActionId(`respond:${request.id}`);
    setFeedback(null);

    const nextStatus = accept ? 'ACCEPTED' : 'DECLINED';

    const { error: requestUpdateError } = await supabase
      .from('training_requests')
      .update({ status: nextStatus })
      .eq('id', request.id);

    if (requestUpdateError) {
      setFeedback(requestUpdateError.message || 'Unable to update request.');
      setBusyActionId(null);
      return;
    }

    if (accept) {
      const { error: sessionError } = await supabase
        .from('training_sessions')
        .update({ status: 'MATCHED' })
        .eq('id', request.session_id);

      if (sessionError) {
        setFeedback(sessionError.message || 'Session status update failed.');
        setBusyActionId(null);
        return;
      }

      const { data: existingMatch } = await supabase
        .from('training_matches')
        .select('id')
        .or(
          `and(session_id.eq.${request.session_id},user_a.eq.${request.requester_id},user_b.eq.${currentUserId}),and(session_id.eq.${request.session_id},user_a.eq.${currentUserId},user_b.eq.${request.requester_id})`
        )
        .maybeSingle();

      if (!existingMatch) {
        const { error: matchError } = await supabase.from('training_matches').insert({
          session_id: request.session_id,
          user_a: request.requester_id,
          user_b: currentUserId,
        } as any);

        if (matchError) {
          setFeedback(matchError.message || 'Unable to create room match.');
          setBusyActionId(null);
          return;
        }
      }

      setFeedback('Session matched. Room is ready.');
    } else {
      setFeedback('Request declined.');
    }

    void refreshAll();
    setBusyActionId(null);
  };

  const markSessionStatus = async (sessionId: string, status: 'COMPLETED' | 'CANCELLED') => {
    if (busyActionId) return;

    setBusyActionId(`session:${sessionId}:${status}`);
    const { error } = await supabase
      .from('training_sessions')
      .update({ status })
      .eq('id', sessionId);

    if (error) setFeedback(error.message || 'Unable to update session status.');
    else {
      setFeedback(status === 'COMPLETED' ? 'Session marked completed.' : 'Session cancelled.');
      void refreshAll();
    }
    setBusyActionId(null);
  };

  const getAuthHeader = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    return `Bearer ${token}`;
  };

  const createQuickSession = async () => {
    const authHeader = await getAuthHeader();
    if (!authHeader || createSubmitting) return;

    setCreateSubmitting(true);
    setFeedback(null);

    const response = await fetch('/api/sessions/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        sessionType: quickSessionType,
        trainingType: currentProfile?.activity_type || focusTraining,
        nutritionType: focusNutrition,
        hostAsCreator: Boolean(currentProfile?.is_creator && hostAsCreatorSession),
        timeOption: quickTimeOption,
        customTime: quickTimeOption === 'custom' ? quickCustomTime : null,
        note: quickNote,
        lat: location?.lat || null,
        lng: location?.lng || null,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { session?: Record<string, any>; error?: string };

    if (!response.ok || !payload.session) {
      setCreateSubmitting(false);
      setFeedback(payload.error || 'Unable to create session.');
      return;
    }

    const created: LiveSessionRow = {
      id: payload.session.id as string,
      host_id: payload.session.host_id as string,
      session_type: (payload.session.session_type as 'solo' | 'open') || 'open',
      session_role: (payload.session.session_role as 'normal' | 'creator') === 'creator' ? 'creator' : 'normal',
      training_type: (payload.session.training_type as string | null) || null,
      nutrition_type: (payload.session.nutrition_type as string | null) || null,
      status: normalizeLiveStatus(payload.session.status as string | null),
      scheduled_time: (payload.session.scheduled_time as string | null) || null,
      created_at: (payload.session.created_at as string) || new Date().toISOString(),
      lat: (payload.session.lat as number | null) ?? null,
      lng: (payload.session.lng as number | null) ?? null,
      note: (payload.session.note as string | null) || null,
      host: currentProfile,
    };

    setLiveSessions((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
    setCreateSubmitting(false);
    setQuickCreateOpen(false);
    setQuickSessionType('open');
    setHostAsCreatorSession(false);
    setQuickTimeOption('now');
    setQuickCustomTime('');
    setQuickNote('');
    setFeedback('Session is live.');
  };

  const joinLiveSession = async (session: LiveSessionRow, mode: 'join' | 'request') => {
    const authHeader = await getAuthHeader();
    if (!authHeader) return;

    const actionId = `live-${mode}:${session.id}`;
    setBusyActionId(actionId);

    const response = await fetch('/api/sessions/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({ sessionId: session.id, mode }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; joined?: boolean };
    setBusyActionId(null);

    if (!response.ok) {
      setFeedback(payload.error || 'Unable to join session.');
      return;
    }

    if (mode === 'join' || payload.joined) {
      router.push(`/room/${session.id}`);
      return;
    }

    setFeedback('Request sent to host.');
  };

  const openRoomForSession = (sessionId: string) => {
    const matchId = matchIdBySessionId[sessionId];
    if (matchId) {
      router.push(`/room/${matchId}`);
      return;
    }

    setFeedback('Room is not ready yet for this session.');
  };

  const scrollToNode = (node: HTMLElement | null) => {
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const requestMatchUser = async (match: MatchCandidate) => {
    if (!currentUserId || busyActionId) return;

    const actionId = `match-request:${match.userId}`;
    setBusyActionId(actionId);
    setFeedback(null);

    const { error } = await supabase.from('training_requests').insert({
      session_id: match.activeSessionId,
      requester_id: currentUserId,
      target_id: match.userId,
      status: 'PENDING',
    } as any);

    if (error) {
      setFeedback(error.message || 'Unable to send request right now.');
    } else {
      setFeedback('Session request sent.');
      void refreshAll();
    }

    setBusyActionId(null);
  };

  const joinMatchSession = async (match: MatchCandidate) => {
    if (!match.activeSessionId) {
      setFeedback('No active session to join right now.');
      return;
    }

    const existingRoom = matchIdBySessionId[match.activeSessionId];
    if (existingRoom) {
      router.push(`/room/${existingRoom}`);
      return;
    }

    await requestMatchUser(match);
  };

  return (
    <div className="flex justify-center min-h-screen bg-black">
      <div className="w-full max-w-[430px] bg-black text-white pb-32">
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <h1 className="text-2xl font-black">Sessions</h1>
          <p className="text-sm text-gray-400 mt-1">Real-time matching by alignment, quality, and proximity.</p>
          <div className="mt-4 rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Your Alignment</h2>
            {alignmentLoading ? (
              <div className="mt-2 inline-flex items-center gap-2 text-sm text-gray-300">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                Analyzing your behavior...
              </div>
            ) : (
              <>
                <div className="mt-2 text-sm font-semibold text-white">
                  Alignment: {alignmentModel.score}% <span className="text-gray-300">· Stage: {alignmentModel.stage}</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">{alignmentModel.progressMessage}</p>
              </>
            )}
          </div>
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-white">Your Focus</h2>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              <div className="min-w-[180px] rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Train</div>
                <div className="mt-1 text-sm font-semibold text-white">{focusTraining}</div>
              </div>
              <div className="min-w-[180px] rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Nutrition</div>
                <div className="mt-1 text-sm font-semibold text-white">{focusNutrition}</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setQuickCreateOpen(true);
                }}
                className="rounded-xl bg-white text-black px-3 py-2 text-sm font-semibold"
              >
                Start Session
              </button>
              <button
                type="button"
                onClick={() => scrollToNode(availableSectionRef.current)}
                className="rounded-xl border border-white/20 bg-white/[0.06] text-white px-3 py-2 text-sm font-semibold"
              >
                Request Session
              </button>
              <button
                type="button"
                onClick={() => scrollToNode(availableSectionRef.current)}
                className="rounded-xl border border-white/20 bg-white/[0.03] text-white px-3 py-2 text-sm font-semibold"
              >
                Browse Sessions
              </button>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">Built for live matching, nearby availability, and in-session coordination.</p>
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setQuickCreateOpen(true)}
              className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white"
            >
              Create Session
            </button>
          </div>
        </div>

        <div className="px-4 py-4 space-y-6">
          {loading && <p className="text-gray-500">Loading sessions...</p>}
          {!loading && feedback && (
            <div className="rounded-xl border border-white/15 bg-white/5 p-3 text-xs text-gray-300">{feedback}</div>
          )}

          {!loading && (
            <>
              <section ref={availableSectionRef}>
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Recommended for You</h2>
                <div className="space-y-3">
                  {recommendedMatches.length === 0 && <p className="text-xs text-gray-500">Preparing personalized matches...</p>}
                  {recommendedMatches.map((match) => (
                    <div key={match.userId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => router.push(`/profile/${match.userId}`)}
                          className="min-w-0 flex items-center gap-3 text-left"
                        >
                          {match.avatarUrl ? (
                            <img src={match.avatarUrl} alt={`${match.username} avatar`} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-white/15" />
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white flex items-center gap-1 truncate">
                              @{match.username}
                              {isVerified(allProfiles.find((profile) => profile.id === match.userId) || null) && <VerificationBadge />}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {typeof match.distanceKm === 'number' ? `${match.distanceKm.toFixed(1)} km away` : 'Distance unavailable'}
                            </div>
                            <div className="text-[11px] text-gray-500 mt-1">{nearbyContextByUserId[match.userId] || 'Gym nearby'}</div>
                            <div className="text-[11px] text-gray-500 mt-1">Alignment {match.alignmentScore}%</div>
                          </div>
                        </button>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => void requestMatchUser(match)}
                            disabled={busyActionId === `match-request:${match.userId}`}
                            className="rounded-xl bg-white text-black px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                          >
                            {busyActionId === `match-request:${match.userId}` ? 'Sending...' : 'Request Session'}
                          </button>
                          {match.hasActiveSession && (
                            <button
                              type="button"
                              onClick={() => void joinMatchSession(match)}
                              className="rounded-xl border border-white/20 bg-white/[0.06] text-white px-3 py-1.5 text-xs font-semibold"
                            >
                              Join
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Live Sessions</h2>
                <div className="space-y-3">
                  {liveSessions.length === 0 && <p className="text-xs text-gray-500">No live sessions yet. Start one now.</p>}
                  {liveSessions.map((session) => {
                    const distance =
                      typeof location?.lat === 'number' &&
                      typeof location?.lng === 'number' &&
                      typeof session.lat === 'number' &&
                      typeof session.lng === 'number'
                        ? toOneDecimal(getDistanceKm(location.lat, location.lng, session.lat, session.lng))
                        : null;

                    const isCreatorSession = session.session_role === 'creator';
                    const isOpen = session.session_type === 'open' || isCreatorSession;
                    const actionMode: 'join' | 'request' = isCreatorSession ? 'join' : isOpen ? 'join' : 'request';
                    const actionLabel = isCreatorSession ? 'Join' : isOpen ? 'Join' : 'Request';

                    return (
                      <div
                        key={session.id}
                        className={
                          isCreatorSession
                            ? 'rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-500/10 to-white/[0.04] p-5'
                            : 'rounded-2xl border border-white/10 bg-white/5 p-4'
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => router.push(`/profile/${session.host_id}`)}
                            className="min-w-0 flex items-center gap-3 text-left"
                          >
                            {session.host?.avatar_url ? (
                              <img src={session.host.avatar_url} alt={`${session.host.username || 'user'} avatar`} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-white/15" />
                            )}
                            <div className="min-w-0">
                              {isCreatorSession && (
                                <div className="text-[10px] uppercase tracking-[0.14em] text-amber-300 font-semibold">Creator Session</div>
                              )}
                              <div className={isCreatorSession ? 'text-[15px] font-bold text-white' : 'text-sm font-semibold text-white'}>
                                {isCreatorSession
                                  ? `Run Club by @${session.host?.username || 'user'}`
                                  : `@${session.host?.username || 'user'}`}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {distance !== null ? `${distance.toFixed(1)} km away` : 'Distance unavailable'}
                              </div>
                              <div className="text-[11px] text-gray-500 mt-1">
                                {session.session_type.toUpperCase()} · {session.status.toUpperCase()}
                              </div>
                              {session.note && <div className="text-[11px] text-gray-400 mt-1 line-clamp-2">{session.note}</div>}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => void joinLiveSession(session, actionMode)}
                            disabled={busyActionId === `live-${actionMode}:${session.id}`}
                            className="rounded-xl bg-white text-black px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                          >
                            {actionLabel}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Requested</h2>
                <div className="space-y-3">
                  {requested.length === 0 && <p className="text-xs text-gray-500">No request activity yet.</p>}
                  {requested.map((request) => (
                    <div key={request.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm font-semibold text-white">
                        {request.session?.intent || request.session?.activity_type || 'Session request'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {request.isIncoming ? 'Incoming request' : 'Your request'} · {request.status}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {request.requester?.username || 'User'} · {formatWhen(request.session?.scheduled_time || request.session?.date_time || request.created_at)}
                      </div>

                      {request.isIncoming && request.status === 'PENDING' && (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => void respondRequest(request, true)}
                            disabled={busyActionId === `respond:${request.id}`}
                            className="flex-1 rounded-lg bg-green-500 text-black py-1.5 text-xs font-semibold disabled:opacity-60"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => void respondRequest(request, false)}
                            disabled={busyActionId === `respond:${request.id}`}
                            className="flex-1 rounded-lg bg-white/10 text-white py-1.5 text-xs disabled:opacity-60"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {request.status === 'ACCEPTED' && request.session_id && (
                        <button
                          type="button"
                          onClick={() => openRoomForSession(request.session_id as string)}
                          className="mt-3 w-full rounded-lg bg-white text-black py-1.5 text-xs font-semibold"
                        >
                          Open Room
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Your Sessions</h2>
                <div className="space-y-3">
                  {yourSessions.length === 0 && <p className="text-xs text-gray-500">No sessions created yet.</p>}
                  {yourSessions.map((session) => (
                    <div key={session.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{session.intent || session.activity_type || 'Session'}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {(session.energy_level || 'FOCUSED')} · {session.location || 'TBD'} · {formatWhen(session.when)}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-1">Status: {session.canonicalStatus}</div>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        {session.canonicalStatus === 'MATCHED' && (
                          <button
                            type="button"
                            onClick={() => openRoomForSession(session.id)}
                            className="flex-1 rounded-lg bg-white text-black py-1.5 text-xs font-semibold"
                          >
                            Open Room
                          </button>
                        )}
                        {session.canonicalStatus !== 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => void markSessionStatus(session.id, 'COMPLETED')}
                            disabled={busyActionId === `session:${session.id}:COMPLETED`}
                            className="flex-1 rounded-lg bg-white/10 text-white py-1.5 text-xs disabled:opacity-60"
                          >
                            Mark Completed
                          </button>
                        )}
                        {session.canonicalStatus === 'OPEN' && (
                          <button
                            type="button"
                            onClick={() => void markSessionStatus(session.id, 'CANCELLED')}
                            disabled={busyActionId === `session:${session.id}:CANCELLED`}
                            className="flex-1 rounded-lg bg-white/10 text-white py-1.5 text-xs disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        {quickCreateOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0e0e0e] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Start Session</h3>
                <button
                  type="button"
                  onClick={() => setQuickCreateOpen(false)}
                  className="text-xs text-gray-400"
                >
                  Close
                </button>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-1">Session Type</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickSessionType('solo')}
                    className={`rounded-lg border px-3 py-2 text-sm ${quickSessionType === 'solo' ? 'border-white text-white' : 'border-white/20 text-gray-400'}`}
                  >
                    Solo
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickSessionType('open')}
                    className={`rounded-lg border px-3 py-2 text-sm ${quickSessionType === 'open' ? 'border-white text-white' : 'border-white/20 text-gray-400'}`}
                  >
                    Open
                  </button>
                </div>
              </div>

              {Boolean(currentProfile?.is_creator) && (
                <label className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hostAsCreatorSession}
                    onChange={(event) => setHostAsCreatorSession(event.target.checked)}
                    className="accent-white"
                  />
                  <span className="text-xs text-gray-200">Host as Creator Session</span>
                </label>
              )}

              <div>
                <div className="text-xs text-gray-400 mb-1">Time</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickTimeOption('now')}
                    className={`rounded-lg border px-2 py-2 text-xs ${quickTimeOption === 'now' ? 'border-white text-white' : 'border-white/20 text-gray-400'}`}
                  >
                    Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickTimeOption('plus30')}
                    className={`rounded-lg border px-2 py-2 text-xs ${quickTimeOption === 'plus30' ? 'border-white text-white' : 'border-white/20 text-gray-400'}`}
                  >
                    +30 min
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickTimeOption('custom')}
                    className={`rounded-lg border px-2 py-2 text-xs ${quickTimeOption === 'custom' ? 'border-white text-white' : 'border-white/20 text-gray-400'}`}
                  >
                    Custom
                  </button>
                </div>
                {quickTimeOption === 'custom' && (
                  <input
                    type="datetime-local"
                    value={quickCustomTime}
                    onChange={(event) => setQuickCustomTime(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm"
                  />
                )}
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-1">Note (optional)</div>
                <textarea
                  value={quickNote}
                  onChange={(event) => setQuickNote(event.target.value)}
                  rows={3}
                  placeholder="Session note"
                  className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm"
                />
              </div>

              <div className="text-[11px] text-gray-500">
                Auto: {currentProfile?.activity_type || focusTraining} · {focusNutrition}
              </div>

              <button
                type="button"
                onClick={() => void createQuickSession()}
                disabled={createSubmitting}
                className="w-full rounded-xl bg-white text-black py-2 text-sm font-semibold disabled:opacity-60"
              >
                {createSubmitting ? 'Starting...' : 'Start Session'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
