import { getDistanceKm } from '@/lib/core/distance';

export type LatLng = {
  lat: number | null;
  lng: number | null;
};

export type MatchUser = {
  id: string;
  trainingType: string | null;
  nutritionType: string | null;
  location: LatLng;
  postsCount: number;
  sessionActivity: number;
};

const normalize = (value: string | null | undefined) => (value || '').trim().toLowerCase();
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function randomBetween(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function inferNutritionType(captions: string[]) {
  const text = captions.join(' ').toLowerCase();
  if (!text.trim()) return null;
  if (/cut|deficit|lean|shred/.test(text)) return 'Cutting';
  if (/bulk|surplus|mass|gain/.test(text)) return 'Bulking';
  if (/maintain|maintenance|recomp/.test(text)) return 'Maintenance';
  if (/vegan|plant|plant-based/.test(text)) return 'Plant-based';
  if (/protein|high protein|macro/.test(text)) return 'High protein';
  return 'Balanced';
}

export function getAlignmentSimilarity(userA: MatchUser, userB: MatchUser) {
  const sameTraining =
    normalize(userA.trainingType) &&
    normalize(userB.trainingType) &&
    normalize(userA.trainingType) === normalize(userB.trainingType);

  const sameNutrition =
    normalize(userA.nutritionType) &&
    normalize(userB.nutritionType) &&
    normalize(userA.nutritionType) === normalize(userB.nutritionType);

  const trainingScore = sameTraining ? 1 : 0.45;
  const nutritionScore = sameNutrition ? 1 : 0.5;
  return trainingScore * 0.65 + nutritionScore * 0.35;
}

export function getProximityScore(locA: LatLng, locB: LatLng) {
  if (
    typeof locA.lat !== 'number' ||
    typeof locA.lng !== 'number' ||
    typeof locB.lat !== 'number' ||
    typeof locB.lng !== 'number'
  ) {
    return { score: 0.5, distance: null as number | null };
  }

  const dist = getDistanceKm(locA.lat, locA.lng, locB.lat, locB.lng);
  const normalized = clamp(1 - dist / 30, 0, 1);
  return { score: normalized, distance: Number(dist.toFixed(1)) };
}

export function getActivityScore(user: MatchUser) {
  const postScore = clamp(user.postsCount / 20, 0, 1);
  const sessionScore = clamp(user.sessionActivity / 10, 0, 1);
  return postScore * 0.55 + sessionScore * 0.45;
}

export function calculateMatchScore(userA: MatchUser, userB: MatchUser) {
  const alignment = getAlignmentSimilarity(userA, userB) * 40;
  const proximity = getProximityScore(userA.location, userB.location).score * 30;
  const activity = getActivityScore(userB) * 20;
  const randomness = Math.random() * 10;

  return Math.round(clamp(alignment + proximity + activity + randomness, 0, 100));
}
