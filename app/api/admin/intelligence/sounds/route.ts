import { jsonError, jsonOk } from '@/lib/server/responses';
import { requireAdminPermission } from '@/lib/requireAdminPermission';

export async function GET(request: Request) {
  const access = await requireAdminPermission(request.headers.get('authorization'), 'can_view_charts');
  if (!access.ok) return jsonError(access.error, access.status);

  const [soundsResult, postsResult, chartsResult] = await Promise.all([
    access.auth.admin
      .from('sounds')
      .select('id, track_name, artist_name, usage_count, avg_alignment_score, adaptive_weight')
      .limit(1000),
    access.auth.admin
      .from('posts')
      .select('sound_id, user_id, likes_count, comments_count, alignment_score')
      .not('sound_id', 'is', null)
      .limit(20000),
    access.auth.admin.from('chart_scores').select('sound_id, score').not('sound_id', 'is', null).limit(1000),
  ]);

  if (soundsResult.error) return jsonError(soundsResult.error.message, 400);
  if (postsResult.error) return jsonError(postsResult.error.message, 400);
  if (chartsResult.error) return jsonError(chartsResult.error.message, 400);

  const chartScoreBySoundId = new Map((chartsResult.data || []).map((row) => [row.sound_id, Number(row.score || 0)]));

  const metricsBySoundId = ((postsResult.data || []) as Array<{
    sound_id: string | null;
    user_id: string | null;
    likes_count?: number | null;
    comments_count?: number | null;
    alignment_score?: number | null;
  }>).reduce<
    Record<string, { total_posts: number; users: Set<string>; engagement_score: number; alignment_score_total: number; alignment_count: number }>
  >((acc, row) => {
    if (!row.sound_id) return acc;
    if (!acc[row.sound_id]) {
      acc[row.sound_id] = { total_posts: 0, users: new Set<string>(), engagement_score: 0, alignment_score_total: 0, alignment_count: 0 };
    }

    const engagement = Number(row.likes_count || 0) + Number(row.comments_count || 0) * 2;
    acc[row.sound_id].total_posts += 1;
    acc[row.sound_id].engagement_score += engagement;
    acc[row.sound_id].alignment_score_total += Number(row.alignment_score || 0);
    acc[row.sound_id].alignment_count += 1;
    if (row.user_id) acc[row.sound_id].users.add(row.user_id);

    return acc;
  }, {});

  const items = (soundsResult.data || []).map((sound) => {
    const metrics = metricsBySoundId[sound.id] || {
      total_posts: 0,
      users: new Set<string>(),
      engagement_score: 0,
      alignment_score_total: 0,
      alignment_count: 0,
    };
    const avgAlignment = metrics.alignment_count > 0 ? metrics.alignment_score_total / metrics.alignment_count : Number(sound.avg_alignment_score || 0);
    const velocity = metrics.total_posts > 0 ? metrics.engagement_score / metrics.total_posts : 0;

    return {
      sound_id: sound.id,
      track_name: sound.track_name || '',
      artist_name: sound.artist_name || '',
      usage_count: Number(sound.usage_count || 0),
      total_posts: metrics.total_posts,
      unique_users: metrics.users.size,
      engagement_score: Math.round(metrics.engagement_score * 100) / 100,
      chart_score: Math.round((chartScoreBySoundId.get(sound.id) || 0) * 100) / 100,
      alignment_score: Math.round(avgAlignment * 100) / 100,
      growth_velocity: Math.round(velocity * 100) / 100,
    };
  });

  items.sort((a, b) => b.chart_score - a.chart_score || b.engagement_score - a.engagement_score);

  return jsonOk({ items: items.slice(0, 250) });
}
