import { supabase } from '@/lib/supabase';
import {
  calculateMatchScore,
  getAlignmentSimilarity,
  getProximityScore,
  inferNutritionType,
  randomBetween,
  type MatchUser,
  type LatLng,
} from '@/lib/core/matchEngine';

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  activity_type: string | null;
};

type UserLocationRow = {
  id: string;
  lat: number | null;
  lng: number | null;
};

type PostRow = {
  user_id: string;
  content: string | null;
};

type TrainingSessionRow = {
  id: string;
  host_id: string | null;
  host_user_id: string | null;
  status: string | null;
  lat: number | null;
  lng: number | null;
};

type TrainingRequestRow = {
  requester_id: string | null;
  target_id: string | null;
  status: string | null;
};

export type MatchCandidate = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  alignmentScore: number;
  matchScore: number;
  hasActiveSession: boolean;
  activeSessionId: string | null;
};

type GetTopMatchesOptions = {
  userLocation?: LatLng | null;
  limit?: number;
};

export { calculateMatchScore } from '@/lib/core/matchEngine';

export async function getTopMatches(currentUserId: string, options: GetTopMatchesOptions = {}): Promise<MatchCandidate[]> {
  const limit = options.limit || 10;

  const { data: allProfilesData } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, activity_type')
    .neq('id', currentUserId)
    .limit(160);

  const profiles = ((allProfilesData || []) as ProfileRow[]).filter((row) => row.id);
  if (profiles.length === 0) return [];

  const allUserIds = [currentUserId, ...profiles.map((profile) => profile.id)];

  const [postsResponse, sessionsHostIdResponse, sessionsHostUserIdResponse, requestsResponse, currentProfileResponse, usersLocationResponse] = await Promise.all([
    supabase
      .from('posts')
      .select('user_id, content')
      .in('user_id', allUserIds)
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase
      .from('training_sessions')
      .select('id, host_id, host_user_id, status, lat, lng')
      .in('host_id', allUserIds)
      .in('status', ['OPEN', 'MATCHED'])
      .order('created_at', { ascending: false })
      .limit(600),
    supabase
      .from('training_sessions')
      .select('id, host_id, host_user_id, status, lat, lng')
      .in('host_user_id', allUserIds)
      .in('status', ['OPEN', 'MATCHED'])
      .order('created_at', { ascending: false })
      .limit(600),
    supabase
      .from('training_requests')
      .select('requester_id, target_id, status')
      .or(`requester_id.in.(${allUserIds.join(',')}),target_id.in.(${allUserIds.join(',')})`)
      .limit(1200),
    supabase
      .from('profiles')
      .select('id, username, avatar_url, activity_type')
      .eq('id', currentUserId)
      .maybeSingle(),
    supabase
      .from('users')
      .select('id, lat, lng')
      .in('id', allUserIds)
      .limit(200),
  ]);

  const posts = (postsResponse.data || []) as PostRow[];
  const sessionsHostId = (sessionsHostIdResponse.data || []) as TrainingSessionRow[];
  const sessionsHostUserId = (sessionsHostUserIdResponse.data || []) as TrainingSessionRow[];
  const requests = (requestsResponse.data || []) as TrainingRequestRow[];
  const currentProfile = (currentProfileResponse.data || null) as ProfileRow | null;
  const usersLocations = (usersLocationResponse.data || []) as UserLocationRow[];
  const locationByUserId = new Map(usersLocations.map((row) => [row.id, { lat: row.lat, lng: row.lng }]));

  const sessionsById = new Map<string, TrainingSessionRow>();
  for (const row of [...sessionsHostId, ...sessionsHostUserId]) {
    if (!row?.id || sessionsById.has(row.id)) continue;
    sessionsById.set(row.id, row);
  }
  const sessions = Array.from(sessionsById.values());

  const postsByUser = new Map<string, PostRow[]>();
  for (const row of posts) {
    if (!row.user_id) continue;
    const existing = postsByUser.get(row.user_id) || [];
    existing.push(row);
    postsByUser.set(row.user_id, existing);
  }

  const sessionActivityByUser = new Map<string, number>();
  const activeSessionByHost = new Map<string, TrainingSessionRow>();

  for (const row of sessions) {
    const host = row.host_id || row.host_user_id;
    if (!host) continue;
    sessionActivityByUser.set(host, (sessionActivityByUser.get(host) || 0) + 1);
    if (!activeSessionByHost.has(host)) activeSessionByHost.set(host, row);
  }

  for (const row of requests) {
    if (row.requester_id) {
      sessionActivityByUser.set(row.requester_id, (sessionActivityByUser.get(row.requester_id) || 0) + 1);
    }
    if (row.target_id) {
      sessionActivityByUser.set(row.target_id, (sessionActivityByUser.get(row.target_id) || 0) + 1);
    }
  }

  const currentSession = activeSessionByHost.get(currentUserId);
  const currentLocation: LatLng = options.userLocation || locationByUserId.get(currentUserId) || {
    lat: currentSession?.lat || null,
    lng: currentSession?.lng || null,
  };

  const currentUser: MatchUser = {
    id: currentUserId,
    trainingType: currentProfile?.activity_type || null,
    nutritionType: inferNutritionType((postsByUser.get(currentUserId) || []).map((post) => post.content || '')),
    location: currentLocation,
    postsCount: (postsByUser.get(currentUserId) || []).length,
    sessionActivity: sessionActivityByUser.get(currentUserId) || 0,
  };

  const candidates = profiles.map((profile) => {
    const candidatePosts = postsByUser.get(profile.id) || [];
    const activeSession = activeSessionByHost.get(profile.id) || null;

    const candidate: MatchUser = {
      id: profile.id,
      trainingType: profile.activity_type,
      nutritionType: inferNutritionType(candidatePosts.map((post) => post.content || '')),
      location: locationByUserId.get(profile.id) || {
        lat: activeSession?.lat || null,
        lng: activeSession?.lng || null,
      },
      postsCount: candidatePosts.length,
      sessionActivity: sessionActivityByUser.get(profile.id) || 0,
    };

    const proximity = getProximityScore(currentUser.location, candidate.location);
    const alignmentScore = Math.round(getAlignmentSimilarity(currentUser, candidate) * 100);

    return {
      userId: profile.id,
      username: profile.username || 'user',
      avatarUrl: profile.avatar_url,
      lat: candidate.location.lat,
      lng: candidate.location.lng,
      distanceKm: proximity.distance,
      alignmentScore,
      matchScore: calculateMatchScore(currentUser, candidate),
      hasActiveSession: Boolean(activeSession),
      activeSessionId: activeSession?.id || null,
    } satisfies MatchCandidate;
  });

  const hasActivitySignals = candidates.some(
    (candidate) => candidate.alignmentScore > 55 || candidate.hasActiveSession
  );

  const sorted = hasActivitySignals
    ? candidates.sort((a, b) => b.matchScore - a.matchScore)
    : candidates
        .map((candidate) => ({
          ...candidate,
          matchScore: randomBetween(20, 40),
          alignmentScore: randomBetween(25, 45),
        }))
        .sort(() => Math.random() - 0.5);

  const top = sorted.slice(0, limit);

  if (top.length === 0 && candidates.length > 0) {
    return candidates
      .sort(() => Math.random() - 0.5)
      .slice(0, limit)
      .map((candidate) => ({
        ...candidate,
        matchScore: randomBetween(20, 40),
        alignmentScore: randomBetween(25, 45),
      }));
  }

  return top;
}
