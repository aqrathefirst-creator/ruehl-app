import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PostRow = {
  id: string;
  sound_id: string | null;
  user_id: string | null;
  created_at: string | null;
  likes_count?: number | null;
  comments_count?: number | null;
  alignment_score?: number | null;
  genre?: string | null;
  views_count?: number | null;
};

type SoundRow = {
  id: string;
  track_name?: string | null;
  artist_name?: string | null;
  title?: string | null;
  artist?: string | null;
  genre?: string | null;
};

type ChartRow = {
  sound_id: string | null;
  rank: number | null;
  movement?: string | null;
};

type ProfileRow = {
  id: string;
  username?: string | null;
};

const asNumber = (value: unknown, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const parseMovementDelta = (movement: string | null | undefined) => {
  const normalized = (movement || '').toLowerCase();
  const parsed = Number.parseInt(normalized.replace(/[^\d+-]/g, ''), 10);
  const hasNumeric = Number.isFinite(parsed);

  if (normalized.includes('up')) return Math.abs(hasNumeric ? parsed : 1);
  if (normalized.includes('down')) return -Math.abs(hasNumeric ? parsed : 1);
  if (hasNumeric) return parsed;
  return 0;
};

const getHealthStatus = (input: {
  rank: number | null;
  movementDelta: number;
  momentum: number;
  growthRate24hVs7d: number;
  engagementTrend: number;
}) => {
  const { rank, movementDelta, momentum, growthRate24hVs7d, engagementTrend } = input;

  if (movementDelta < 0 || growthRate24hVs7d < -20 || engagementTrend < -15) return 'Declining';
  if (typeof rank === 'number' && rank <= 5 && momentum >= 30) return 'Peaking';
  if (movementDelta > 0 || growthRate24hVs7d >= 20 || momentum >= 20) return 'Rising';
  return 'Emerging';
};

export async function GET(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { admin } = auth;

  const postsWithViews = await admin
    .from('posts')
    .select('id, sound_id, user_id, created_at, likes_count, comments_count, alignment_score, genre, views_count')
    .not('sound_id', 'is', null)
    .limit(20000);

  const postsNoViews = postsWithViews.error
    ? await admin
        .from('posts')
        .select('id, sound_id, user_id, created_at, likes_count, comments_count, alignment_score, genre')
        .not('sound_id', 'is', null)
        .limit(20000)
    : null;

  const postsResult = postsWithViews.error ? postsNoViews : postsWithViews;
  if (!postsResult || postsResult.error) {
    return jsonError(postsResult?.error?.message || 'Unable to load posts analytics', 400);
  }

  const [soundsResult, chartResult, profilesResult] = await Promise.all([
    admin.from('sounds').select('id, track_name, artist_name, title, artist, genre').limit(20000),
    admin.from('chart_scores').select('sound_id, rank, movement').not('sound_id', 'is', null).limit(20000),
    admin.from('profiles').select('id, username').limit(20000),
  ]);

  if (soundsResult.error) return jsonError(soundsResult.error.message, 400);
  if (chartResult.error) return jsonError(chartResult.error.message, 400);
  if (profilesResult.error) return jsonError(profilesResult.error.message, 400);

  const posts = ((postsResult.data || []) as PostRow[]);
  const sounds = ((soundsResult.data || []) as SoundRow[]);
  const chartRows = ((chartResult.data || []) as ChartRow[]);
  const profiles = ((profilesResult.data || []) as ProfileRow[]);

  const now = Date.now();
  const ms24h = 24 * 60 * 60 * 1000;
  const ms7d = 7 * 24 * 60 * 60 * 1000;

  const soundById = new Map<string, SoundRow>(sounds.map((row) => [row.id, row]));
  const chartBySoundId = new Map<string, ChartRow>(chartRows.filter((row) => Boolean(row.sound_id)).map((row) => [row.sound_id as string, row]));
  const usernameById = new Map<string, string>(profiles.map((row) => [row.id, row.username || 'user']));

  const soundStats = posts.reduce<Record<string, {
    totalPosts: number;
    uniqueUsers: Set<string>;
    totalEngagement: number;
    totalReach: number;
    alignmentTotal: number;
    alignmentCount: number;
    posts24h: number;
    posts7d: number;
    postsPrev7d: number;
    engagement24h: number;
    engagement7d: number;
    engagementPrev7d: number;
    uniqueUsers24h: Set<string>;
    genreCounts: Record<string, number>;
  }>>((acc, post) => {
    if (!post.sound_id) return acc;

    if (!acc[post.sound_id]) {
      acc[post.sound_id] = {
        totalPosts: 0,
        uniqueUsers: new Set<string>(),
        totalEngagement: 0,
        totalReach: 0,
        alignmentTotal: 0,
        alignmentCount: 0,
        posts24h: 0,
        posts7d: 0,
        postsPrev7d: 0,
        engagement24h: 0,
        engagement7d: 0,
        engagementPrev7d: 0,
        uniqueUsers24h: new Set<string>(),
        genreCounts: {},
      };
    }

    const target = acc[post.sound_id];
    const likes = asNumber(post.likes_count, 0);
    const comments = asNumber(post.comments_count, 0);
    const engagement = likes + comments;

    target.totalPosts += 1;
    target.totalEngagement += engagement;
    target.totalReach += Math.max(asNumber(post.views_count, 0), engagement * 12, 25);

    if (post.user_id) target.uniqueUsers.add(post.user_id);

    const alignment = asNumber(post.alignment_score, 0);
    target.alignmentTotal += alignment;
    target.alignmentCount += 1;

    const genre = (post.genre || soundById.get(post.sound_id)?.genre || 'unlabeled').trim().toLowerCase();
    target.genreCounts[genre] = (target.genreCounts[genre] || 0) + 1;

    const createdMs = new Date(post.created_at || 0).getTime();
    if (Number.isFinite(createdMs)) {
      const age = now - createdMs;
      if (age <= ms24h) {
        target.posts24h += 1;
        target.engagement24h += engagement;
        if (post.user_id) target.uniqueUsers24h.add(post.user_id);
      }
      if (age <= ms7d) {
        target.posts7d += 1;
        target.engagement7d += engagement;
      }
      if (age > ms7d && age <= 2 * ms7d) {
        target.postsPrev7d += 1;
        target.engagementPrev7d += engagement;
      }
    }

    return acc;
  }, {});

  const topSounds = Object.entries(soundStats)
    .map(([soundId, stats]) => {
      const sound = soundById.get(soundId);
      const chart = chartBySoundId.get(soundId);
      const movementDelta = parseMovementDelta(chart?.movement);

      const growthRate24hVs7d = ((stats.posts24h * 7 - Math.max(stats.posts7d, 1)) / Math.max(stats.posts7d, 1)) * 100;
      const growthRate7d = ((stats.posts7d - Math.max(stats.postsPrev7d, 1)) / Math.max(stats.postsPrev7d, 1)) * 100;
      const engagementTrend = ((stats.engagement7d - Math.max(stats.engagementPrev7d, 1)) / Math.max(stats.engagementPrev7d, 1)) * 100;
      const momentum = stats.posts24h * 0.5 + stats.engagement24h * 0.3 + stats.uniqueUsers24h.size * 0.2;
      const engagementRate = stats.totalReach > 0 ? (stats.totalEngagement / stats.totalReach) * 100 : 0;
      const avgAlignment = stats.alignmentCount > 0 ? stats.alignmentTotal / stats.alignmentCount : 0;

      return {
        sound_id: soundId,
        rank: chart?.rank || null,
        track_name: sound?.track_name || sound?.title || 'Unknown track',
        artist_name: sound?.artist_name || sound?.artist || 'Unknown artist',
        total_posts: stats.totalPosts,
        unique_users: stats.uniqueUsers.size,
        total_engagement: stats.totalEngagement,
        total_reach: Math.round(stats.totalReach),
        engagement_rate: Math.round(engagementRate * 100) / 100,
        growth_rate_24h_vs_7d: Math.round(growthRate24hVs7d * 100) / 100,
        growth_rate_7d: Math.round(growthRate7d * 100) / 100,
        avg_alignment_score: Math.round(avgAlignment * 100) / 100,
        momentum: Math.round(momentum * 100) / 100,
        movement_delta: movementDelta,
        engagement_velocity: Math.round((stats.engagement24h + stats.engagement7d / 7) * 100) / 100,
        health_status: getHealthStatus({
          rank: chart?.rank || null,
          movementDelta,
          momentum,
          growthRate24hVs7d,
          engagementTrend,
        }),
      };
    })
    .sort((a, b) => {
      if (typeof a.rank === 'number' && typeof b.rank === 'number') return a.rank - b.rank;
      if (typeof a.rank === 'number') return -1;
      if (typeof b.rank === 'number') return 1;
      return b.total_posts - a.total_posts;
    });

  const trendingMomentum = [...topSounds]
    .sort((a, b) => {
      const aScore = a.growth_rate_24h_vs_7d * 0.5 + a.movement_delta * 0.3 + a.engagement_velocity * 0.2;
      const bScore = b.growth_rate_24h_vs_7d * 0.5 + b.movement_delta * 0.3 + b.engagement_velocity * 0.2;
      return bScore - aScore;
    })
    .slice(0, 12)
    .map((row) => ({
      sound_id: row.sound_id,
      track_name: row.track_name,
      artist_name: row.artist_name,
      growth_rate_24h_vs_7d: row.growth_rate_24h_vs_7d,
      movement_change: row.movement_delta,
      engagement_velocity: row.engagement_velocity,
    }));

  const genreAccumulator = Object.entries(soundStats).reduce<Record<string, { usage: number; engagement: number }>>((acc, [soundId, stats]) => {
    const fallbackGenre = (soundById.get(soundId)?.genre || 'unlabeled').trim().toLowerCase();
    const dominantGenre = Object.entries(stats.genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || fallbackGenre;

    if (!acc[dominantGenre]) {
      acc[dominantGenre] = { usage: 0, engagement: 0 };
    }
    acc[dominantGenre].usage += stats.totalPosts;
    acc[dominantGenre].engagement += stats.totalEngagement;
    return acc;
  }, {});

  const genrePerformance = Object.entries(genreAccumulator)
    .map(([genre, values]) => ({
      genre,
      usage_posts: values.usage,
      engagement_total: values.engagement,
    }))
    .sort((a, b) => b.usage_posts - a.usage_posts);

  const contributionByUser = posts.reduce<Record<string, { posts: number; engagement: number; alignment: number; alignmentCount: number }>>((acc, post) => {
    if (!post.user_id || !post.sound_id) return acc;
    if (!acc[post.user_id]) {
      acc[post.user_id] = { posts: 0, engagement: 0, alignment: 0, alignmentCount: 0 };
    }

    const target = acc[post.user_id];
    target.posts += 1;
    target.engagement += asNumber(post.likes_count, 0) + asNumber(post.comments_count, 0);
    target.alignment += asNumber(post.alignment_score, 0);
    target.alignmentCount += 1;

    return acc;
  }, {});

  const userContribution = Object.entries(contributionByUser)
    .map(([userId, stats]) => {
      const avgAlignment = stats.alignmentCount > 0 ? stats.alignment / stats.alignmentCount : 0;
      const contributionScore = stats.posts * 0.45 + stats.engagement * 0.4 + avgAlignment * 0.15;

      return {
        user_id: userId,
        username: usernameById.get(userId) || 'user',
        posts: stats.posts,
        engagement: stats.engagement,
        contribution_score: Math.round(contributionScore * 100) / 100,
      };
    })
    .sort((a, b) => b.contribution_score - a.contribution_score)
    .slice(0, 20);

  return jsonOk({
    generated_at: new Date().toISOString(),
    top_sounds: topSounds.slice(0, 20),
    trending_momentum: trendingMomentum,
    genre_performance: genrePerformance,
    user_contribution: userContribution,
    report_preparation: {
      ready: true,
      status: 'queued-template-only',
      next: 'PDF export and shareable distributor link are prepared in UI scaffold only.',
    },
  });
}
