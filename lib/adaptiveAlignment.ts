/* eslint-disable @typescript-eslint/no-explicit-any */

type EngagementPost = {
  likes_count?: number | null;
  comments_count?: number | null;
  lifts_count?: number | null;
};

type SupabaseLikeClient = {
  from: (table: string) => {
    select: (columns: string) => any;
    update: (values: Record<string, unknown>) => any;
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const asNumber = (value: unknown) => {
  const next = Number(value || 0);
  return Number.isFinite(next) ? next : 0;
};

export function computeEngagementScore(post: EngagementPost) {
  return asNumber(post.likes_count) * 1 + asNumber(post.comments_count) * 2 + asNumber(post.lifts_count) * 5;
}

export function computeAdaptiveWeight(avgAlignment: number, avgEngagement: number) {
  let adaptiveWeight = 1;

  if (avgAlignment > 70 && avgEngagement >= 25) adaptiveWeight = 1.5;
  else if (avgAlignment > 70 && avgEngagement >= 12) adaptiveWeight = 1.3;
  else if (avgAlignment < 45 && avgEngagement < 6) adaptiveWeight = 0.9;
  else if (avgAlignment < 35 && avgEngagement < 3) adaptiveWeight = 0.7;

  return clamp(adaptiveWeight, 0.75, 1.5);
}

export function computeFinalAlignmentScore(baseAlignmentScore: number, adaptiveWeight: number) {
  const cappedAlignment = clamp(asNumber(baseAlignmentScore), 0, 100);
  const safeWeight = clamp(asNumber(adaptiveWeight || 1), 0.75, 1.5);
  const finalScore = cappedAlignment * safeWeight;
  return clamp(Math.round(finalScore * 100) / 100, 0, 100);
}

async function getRecentSoundPosts(client: SupabaseLikeClient, soundId: string, sinceIso: string) {
  const primary = await client
    .from('posts')
    .select('id, alignment_score, likes_count, comments_count, lifts_count, created_at')
    .eq('sound_id', soundId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(240);

  if (!primary.error) return (primary.data || []) as Array<Record<string, unknown>>;

  const missingCounts = /likes_count|comments_count|lifts_count/i.test(primary.error.message || '');
  if (!missingCounts) throw primary.error;

  const fallback = await client
    .from('posts')
    .select('id, alignment_score, created_at')
    .eq('sound_id', soundId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(240);

  if (fallback.error) throw fallback.error;

  const posts = (fallback.data || []) as Array<Record<string, unknown>>;
  if (!posts.length) return posts;

  const postIds = posts.map((item) => String(item.id || '')).filter(Boolean);
  if (!postIds.length) return posts;

  const [likes, comments, lifts] = await Promise.all([
    client.from('likes').select('post_id').in('post_id', postIds),
    client.from('comments').select('post_id').in('post_id', postIds),
    client.from('post_lifts').select('post_id').in('post_id', postIds),
  ]);

  const countByPost = (rows: Array<{ post_id?: string | null }> | null | undefined) =>
    (rows || []).reduce<Record<string, number>>((acc, row) => {
      const postId = row.post_id || '';
      if (!postId) return acc;
      acc[postId] = (acc[postId] || 0) + 1;
      return acc;
    }, {});

  const likeCounts = countByPost(likes.data as Array<{ post_id?: string | null }>);
  const commentCounts = countByPost(comments.data as Array<{ post_id?: string | null }>);
  const liftCounts = countByPost(lifts.data as Array<{ post_id?: string | null }>);

  return posts.map((post) => {
    const id = String(post.id || '');
    return {
      ...post,
      likes_count: likeCounts[id] || 0,
      comments_count: commentCounts[id] || 0,
      lifts_count: liftCounts[id] || 0,
    };
  });
}

export async function updateSoundAdaptiveWeight(client: SupabaseLikeClient, soundId: string, windowHours = 48) {
  if (!soundId) return { adaptiveWeight: 1, avgAlignment: 0, avgEngagement: 0 };

  const sinceIso = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const posts = await getRecentSoundPosts(client, soundId, sinceIso);

  if (!posts.length) {
    await client
      .from('sounds')
      .update({
        avg_alignment_score: 0,
        avg_engagement_score: 0,
        adaptive_weight: 1,
      })
      .eq('id', soundId);

    return { adaptiveWeight: 1, avgAlignment: 0, avgEngagement: 0 };
  }

  const totals = posts.reduce<{ alignment: number; engagement: number; count: number }>(
    (acc, post) => {
      const row = post as {
        alignment_score?: number | null;
        likes_count?: number | null;
        comments_count?: number | null;
        lifts_count?: number | null;
      };
      const alignment = asNumber(row.alignment_score);
      const engagement = computeEngagementScore({
        likes_count: asNumber(row.likes_count),
        comments_count: asNumber(row.comments_count),
        lifts_count: asNumber(row.lifts_count),
      });

      return {
        alignment: acc.alignment + alignment,
        engagement: acc.engagement + engagement,
        count: acc.count + 1,
      };
    },
    { alignment: 0, engagement: 0, count: 0 }
  );

  const avgAlignment = totals.count ? totals.alignment / totals.count : 0;
  const avgEngagement = totals.count ? totals.engagement / totals.count : 0;
  const adaptiveWeight = computeAdaptiveWeight(avgAlignment, avgEngagement);

  await client
    .from('sounds')
    .update({
      avg_alignment_score: Math.round(avgAlignment * 100) / 100,
      avg_engagement_score: Math.round(avgEngagement * 100) / 100,
      adaptive_weight: adaptiveWeight,
    })
    .eq('id', soundId);

  return { adaptiveWeight, avgAlignment, avgEngagement };
}

export async function getSoundAdaptiveWeight(client: SupabaseLikeClient, soundId: string) {
  if (!soundId) return 1;

  const { data, error } = await client
    .from('sounds')
    .select('adaptive_weight')
    .eq('id', soundId)
    .maybeSingle();

  if (error) return 1;
  return asNumber((data as { adaptive_weight?: number | null } | null)?.adaptive_weight || 1) || 1;
}

export async function refreshAdaptiveWeightsForSounds(client: SupabaseLikeClient, soundIds: string[]) {
  const uniqueSoundIds = Array.from(new Set(soundIds.filter(Boolean)));

  for (const soundId of uniqueSoundIds) {
    await updateSoundAdaptiveWeight(client, soundId);
  }
}
