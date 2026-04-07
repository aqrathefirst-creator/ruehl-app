import type { SupabaseClient } from '@supabase/supabase-js';
import { computeSessionAlignment, type SessionEnergy } from '@/lib/sessions/computeSessionAlignment';

type ProfileLite = {
  id: string;
  username?: string | null;
  activity_type?: string | null;
  verified?: boolean | null;
  is_verified?: boolean | null;
  reliability_score?: number | null;
  sessions_completed?: number | null;
  rank_score?: number | null;
};

type SessionRow = {
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
  visibility: string | null;
  created_at: string | null;
};

export type AvailableSession = {
  id: string;
  hostId: string;
  hostProfile: ProfileLite | null;
  intent: string;
  energyLevel: SessionEnergy;
  location: string;
  lat: number | null;
  lng: number | null;
  scheduledTime: string;
  status: 'OPEN' | 'MATCHED' | 'COMPLETED' | 'CANCELLED';
  visibility: 'PUBLIC' | 'REQUEST' | 'PRIVATE';
  createdAt: string;
  distanceKm: number | null;
  qualityScore: number;
  alignmentScore: number;
};

export type SessionDiscoveryOptions = {
  currentUserId: string;
  userProfile?: ProfileLite | null;
  userLocation?: { lat: number; lng: number } | null;
  proximityKm?: number | null;
  preferredIntent?: string | null;
  preferredEnergy?: SessionEnergy | null;
};

const normalize = (value: string | null | undefined) => (value || '').trim().toLowerCase();

const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const statusToCanonical = (value: string | null | undefined): AvailableSession['status'] => {
  const normalized = normalize(value).toUpperCase();
  if (normalized === 'MATCHED') return 'MATCHED';
  if (normalized === 'COMPLETED') return 'COMPLETED';
  if (normalized === 'CANCELLED') return 'CANCELLED';
  return 'OPEN';
};

const visibilityToCanonical = (value: string | null | undefined): AvailableSession['visibility'] => {
  const normalized = normalize(value).toUpperCase();
  if (normalized === 'PRIVATE') return 'PRIVATE';
  if (normalized === 'REQUEST') return 'REQUEST';
  return 'PUBLIC';
};

const toQualityScore = (profile: ProfileLite | null) => {
  if (!profile) return 0;

  let score = 0;
  if (profile.verified || profile.is_verified) score += 35;
  score += Math.min(30, Math.max(0, Number(profile.reliability_score || 0)) * 0.3);
  score += Math.min(20, Number(profile.sessions_completed || 0));
  score += Math.min(15, Math.max(0, Number(profile.rank_score || 0)) * 0.15);

  return Math.round(score);
};

export async function getAvailableSessions(
  supabase: SupabaseClient,
  options: SessionDiscoveryOptions
): Promise<AvailableSession[]> {
  const { currentUserId } = options;

  const { data: sessionsData, error: sessionsError } = await supabase
    .from('training_sessions')
    .select('id, host_id, host_user_id, intent, activity_type, energy_level, location, lat, lng, scheduled_time, date_time, status, visibility, created_at')
    .order('created_at', { ascending: false })
    .limit(250);

  if (sessionsError) throw sessionsError;

  const sessions = ((sessionsData || []) as SessionRow[])
    .map((row) => {
      const hostId = row.host_id || row.host_user_id || null;
      const status = statusToCanonical(row.status);
      const visibility = visibilityToCanonical(row.visibility);
      const scheduledTime = row.scheduled_time || row.date_time || row.created_at || new Date().toISOString();
      const energyLevel = (row.energy_level || 'FOCUSED') as SessionEnergy;

      return {
        ...row,
        hostId,
        status,
        visibility,
        scheduledTime,
        energyLevel,
      };
    })
    .filter((row) => row.status === 'OPEN')
    .filter((row) => !!row.hostId)
    .filter((row) => row.hostId !== currentUserId)
    .filter((row) => row.visibility !== 'PRIVATE');

  const hostIds = Array.from(new Set(sessions.map((item) => item.hostId).filter(Boolean))) as string[];

  const { data: profilesData } = hostIds.length
    ? await supabase
        .from('profiles')
        .select('id, username, activity_type, verified, is_verified, reliability_score, sessions_completed, rank_score')
        .in('id', hostIds)
    : { data: [] as ProfileLite[] };

  const profileById = new Map(((profilesData || []) as ProfileLite[]).map((profile) => [profile.id, profile]));

  const enriched = sessions
    .map((row): AvailableSession | null => {
      if (!row.hostId) return null;

      let computedDistance: number | null = null;
      if (
        options.userLocation &&
        typeof row.lat === 'number' &&
        typeof row.lng === 'number'
      ) {
        computedDistance = distanceKm(options.userLocation.lat, options.userLocation.lng, row.lat, row.lng);
      }

      if (
        typeof options.proximityKm === 'number' &&
        computedDistance !== null &&
        computedDistance > options.proximityKm
      ) {
        return null;
      }

      const hostProfile = profileById.get(row.hostId) || null;
      const qualityScore = toQualityScore(hostProfile);

      if (qualityScore < 20) {
        return null;
      }

      const preferredIntent = options.preferredIntent || options.userProfile?.activity_type || null;
      const similarActivityHistory =
        normalize(options.userProfile?.activity_type) &&
        normalize(hostProfile?.activity_type) &&
        normalize(options.userProfile?.activity_type) === normalize(hostProfile?.activity_type);

      const alignmentScore = computeSessionAlignment({
        sessionIntent: row.intent || row.activity_type || '',
        preferredIntent,
        sessionEnergy: row.energyLevel,
        preferredEnergy: options.preferredEnergy || null,
        similarActivityHistory: Boolean(similarActivityHistory),
        distanceKm: computedDistance,
      });

      return {
        id: row.id,
        hostId: row.hostId,
        hostProfile,
        intent: row.intent || row.activity_type || 'General',
        energyLevel: row.energyLevel,
        location: row.location || 'TBD',
        lat: row.lat,
        lng: row.lng,
        scheduledTime: row.scheduledTime,
        status: row.status,
        visibility: row.visibility,
        createdAt: row.created_at || new Date().toISOString(),
        distanceKm: computedDistance,
        qualityScore,
        alignmentScore,
      };
    })
    .filter((item): item is AvailableSession => Boolean(item));

  enriched.sort((a, b) => {
    if (b.alignmentScore !== a.alignmentScore) return b.alignmentScore - a.alignmentScore;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return enriched;
}
