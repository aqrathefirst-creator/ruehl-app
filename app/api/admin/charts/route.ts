import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SoundMetricRow = {
  id: string;
  track_name?: string | null;
  artist_name?: string | null;
  title?: string | null;
  artist?: string | null;
  total_posts?: number | null;
  unique_users?: number | null;
  last_used_at?: string | null;
};

type PostSignalRow = {
  sound_id: string | null;
  user_id: string | null;
  created_at: string | null;
  alignment_score?: number | null;
};

type PreviousChartRow = {
  sound_id: string | null;
  rank: number | null;
  lifecycle?: string | null;
  velocity?: number | null;
  last_24h_score?: number | null;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const asFinite = (value: unknown, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

async function fetchSoundsWithSignals(admin: ReturnType<typeof requireAdmin> extends Promise<infer T>
  ? T extends { ok: true; admin: infer C }
    ? C
    : never
  : never) {
  const primary = await admin
    .from('sounds')
    .select('id, track_name, artist_name, total_posts, unique_users, last_used_at');

  if (!primary.error) {
    return { rows: (primary.data || []) as SoundMetricRow[] };
  }

  const isMissingMetricColumn = /total_posts|unique_users|last_used_at/i.test(primary.error.message || '');
  if (!isMissingMetricColumn) {
    return { rows: null, error: primary.error.message };
  }

  const fallback = await admin
    .from('sounds')
    .select('id, track_name, artist_name, title, artist, last_used_at');

  if (!fallback.error) {
    return { rows: (fallback.data || []) as SoundMetricRow[] };
  }

  const fallbackNoLastUsed = await admin
    .from('sounds')
    .select('id, track_name, artist_name, title, artist');

  if (fallbackNoLastUsed.error) {
    return { rows: null, error: fallbackNoLastUsed.error.message };
  }

  return { rows: (fallbackNoLastUsed.data || []) as SoundMetricRow[] };
}

async function recomputeCharts(admin: ReturnType<typeof requireAdmin> extends Promise<infer T>
  ? T extends { ok: true; admin: infer C }
    ? C
    : never
  : never) {
  const soundsResult = await fetchSoundsWithSignals(admin);
  if (!soundsResult.rows) {
    return { ok: false as const, error: soundsResult.error || 'Failed to fetch sounds' };
  }

  const sounds = soundsResult.rows;

  const { data: postSignals, error: postSignalError } = await admin
    .from('posts')
    .select('sound_id, user_id, created_at, alignment_score')
    .not('sound_id', 'is', null);

  if (postSignalError) {
    return { ok: false as const, error: postSignalError.message };
  }

  const postRows = ((postSignals || []) as PostSignalRow[]).slice().sort((a, b) => {
    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
  });

  const bySound = postRows.reduce<
    Record<string, {
      effective_posts: number;
      users: Set<string>;
      last_used_at: string | null;
      alignment_total: number;
      alignment_count: number;
      lastAcceptedAtByUser: Map<string, number>;
    }>
  >((acc, row) => {
    if (!row.sound_id) return acc;

    if (!acc[row.sound_id]) {
      acc[row.sound_id] = {
        effective_posts: 0,
        users: new Set<string>(),
        last_used_at: null,
        alignment_total: 0,
        alignment_count: 0,
        lastAcceptedAtByUser: new Map<string, number>(),
      };
    }

    const createdAtMs = new Date(row.created_at || 0).getTime();

    if (row.user_id) {
      const previousAcceptedMs = acc[row.sound_id].lastAcceptedAtByUser.get(row.user_id);
      const inCooldown =
        Number.isFinite(createdAtMs) &&
        typeof previousAcceptedMs === 'number' &&
        createdAtMs - previousAcceptedMs < 24 * 60 * 60 * 1000;

      if (!inCooldown) {
        acc[row.sound_id].effective_posts += 1;
        if (Number.isFinite(createdAtMs)) {
          acc[row.sound_id].lastAcceptedAtByUser.set(row.user_id, createdAtMs);
        }
      }
      acc[row.sound_id].users.add(row.user_id);
    } else {
      acc[row.sound_id].effective_posts += 1;
    }

    const alignment = clamp(asFinite(row.alignment_score, 0), 0, 100);
    if (Number.isFinite(alignment)) {
      acc[row.sound_id].alignment_total += alignment;
      acc[row.sound_id].alignment_count += 1;
    }

    if (row.created_at) {
      const nextTs = new Date(row.created_at).getTime();
      const prevTs = new Date(acc[row.sound_id].last_used_at || 0).getTime();
      if (!Number.isFinite(prevTs) || nextTs > prevTs) {
        acc[row.sound_id].last_used_at = row.created_at;
      }
    }

    return acc;
  }, {});

  const { data: previousRows, error: previousError } = await admin
    .from('chart_scores')
    .select('sound_id, rank, lifecycle, velocity, last_24h_score');

  if (previousError) {
    return { ok: false as const, error: previousError.message };
  }

  const previousBySoundId = ((previousRows || []) as PreviousChartRow[]).reduce<
    Record<string, { rank: number | null; lifecycle: string | null; velocity: number; last24: number }>
  >((acc, row) => {
    if (!row.sound_id) return acc;
    acc[row.sound_id] = {
      rank: row.rank ?? null,
      lifecycle: row.lifecycle ?? null,
      velocity: Math.max(0, asFinite(row.velocity, 0)),
      last24: Math.max(0, asFinite(row.last_24h_score, 0)),
    };
    return acc;
  }, {});

  const nowMs = Date.now();

  const ranked = sounds.map((sound) => {
    const fallbackSignal = bySound[sound.id];
    const effectivePosts = fallbackSignal?.effective_posts ?? Math.max(0, asFinite(sound.total_posts, 0));
    const uniqueness = sound.unique_users ?? fallbackSignal?.users.size ?? 0;
    const lastUsed = sound.last_used_at ?? fallbackSignal?.last_used_at ?? null;
    const lastUsedTs = new Date(lastUsed || 0).getTime();
    const recency = Number.isFinite(lastUsedTs) ? nowMs - lastUsedTs : nowMs;
    const averageAlignment = fallbackSignal && fallbackSignal.alignment_count > 0
      ? fallbackSignal.alignment_total / fallbackSignal.alignment_count
      : 0;

    const previous = previousBySoundId[sound.id];
    const previousVelocity = Math.max(0, asFinite(previous?.velocity, 0));
    const previousLast24Score = Math.max(0, asFinite(previous?.last24, 0));

    const baseScore =
      Math.log(effectivePosts + 1) * 5 +
      Math.max(0, asFinite(uniqueness, 0)) * 3 -
      recency * 0.00001;

    const currentSpike = Math.max(0, baseScore - previousLast24Score);
    const smoothedVelocity = previousVelocity * 0.7 + currentSpike * 0.3;
    const alignmentContribution = Math.min(Math.max(0, averageAlignment), 100) * 1.5;
    const score =
      baseScore * 0.6 +
      alignmentContribution * 0.2 +
      smoothedVelocity * 0.2;

    const meetsThreshold = effectivePosts >= 3 && Math.max(0, asFinite(uniqueness, 0)) >= 2;

    return {
      ...sound,
      score,
      velocity: smoothedVelocity,
      last24Score: score,
      effectivePosts,
      uniqueUsers: Math.max(0, asFinite(uniqueness, 0)),
      meetsThreshold,
    };
  });

  const eligible = ranked
    .filter((row) => row.meetsThreshold)
    .sort((a, b) => b.score - a.score);
  const ineligibleSoundIds = ranked
    .filter((row) => !row.meetsThreshold)
    .map((row) => row.id)
    .filter(Boolean);

  const updatedAt = new Date().toISOString();

  const payload = eligible.map((sound, index) => {
    const targetRank = index + 1;
    const previous = previousBySoundId[sound.id];
    const previousRank = previous?.rank ?? null;
    const minAllowedRank = previousRank === null ? targetRank : Math.max(1, previousRank - 5);
    const maxAllowedRank = previousRank === null ? targetRank : previousRank + 5;
    const boundedRank = previousRank === null
      ? targetRank
      : Math.max(minAllowedRank, Math.min(targetRank, maxAllowedRank));

    const movementDelta = previousRank === null ? 0 : previousRank - boundedRank;

    const movement = previousRank === null
      ? 'new'
      : movementDelta > 0
        ? 'up'
        : movementDelta < 0
          ? 'down'
          : 'stable';

    const lifecycle = previousRank === null
      ? 'birth'
      : movement === 'up'
        ? 'rise'
        : movement === 'down'
          ? 'decay'
          : previous?.lifecycle || 'peak';

    return {
      sound_id: sound.id,
      rank: boundedRank,
      movement,
      lifecycle,
      post_count: sound.effectivePosts,
      unique_user_count: sound.uniqueUsers,
      velocity: sound.velocity,
      last_24h_score: sound.last24Score,
      score: sound.score,
      updated_at: updatedAt,
    };
  });

  const upsertResult = await admin
    .from('chart_scores')
    .upsert(payload, { onConflict: 'sound_id' });

  if (!upsertResult.error) {
    if (ineligibleSoundIds.length > 0) {
      await admin
        .from('chart_scores')
        .update({ rank: null, movement: 'stable', updated_at: updatedAt })
        .in('sound_id', ineligibleSoundIds);
    }

    return {
      ok: true as const,
      totalSoundsProcessed: ranked.length,
      rankingComplete: true,
      chartScoresUpdated: true,
    };
  }

  const canFallback = /onConflict|constraint|unique/i.test(upsertResult.error.message || '');
  if (!canFallback) {
    return { ok: false as const, error: upsertResult.error.message };
  }

  for (const row of payload) {
    const updateResult = await admin
      .from('chart_scores')
      .update({
        rank: row.rank,
        movement: row.movement,
        lifecycle: row.lifecycle,
        updated_at: row.updated_at,
      })
      .eq('sound_id', row.sound_id);

    if (updateResult.error) {
      const insertResult = await admin.from('chart_scores').insert(row);
      if (insertResult.error) {
        return { ok: false as const, error: insertResult.error.message };
      }
    }
  }

  if (ineligibleSoundIds.length > 0) {
    await admin
      .from('chart_scores')
      .update({ rank: null, movement: 'stable', updated_at: updatedAt })
      .in('sound_id', ineligibleSoundIds);
  }

  return {
    ok: true as const,
    totalSoundsProcessed: ranked.length,
    rankingComplete: true,
    chartScoresUpdated: true,
  };
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { error } = await auth.admin.from('admin_requests').insert({
    admin_id: auth.user.id,
    submitted_by: auth.user.id,
    subject: 'OVERRIDE_CHART',
    target_id: 'GLOBAL_CHARTS',
    target: 'GLOBAL_CHARTS',
    notes: 'Chart recompute/override requested from charts endpoint',
    status: 'pending',
  });

  if (error) return jsonError(error.message, 400);

  return jsonOk({ success: true, message: 'Request submitted for approval' });
}

export async function GET(request: Request) {
  return POST(request);
}
