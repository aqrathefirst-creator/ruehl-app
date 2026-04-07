import { jsonError, jsonOk } from '@/lib/server/responses';
import { requireAdminPermission } from '@/lib/requireAdminPermission';

export async function GET(request: Request) {
  const access = await requireAdminPermission(request.headers.get('authorization'), 'can_view_charts');
  if (!access.ok) return jsonError(access.error, access.status);

  const [chartsResult, soundsResult] = await Promise.all([
    access.auth.admin
      .from('chart_scores')
      .select('sound_id, score, post_count, like_count, comment_count, lift_count, velocity')
      .not('sound_id', 'is', null)
      .limit(1000),
    access.auth.admin.from('sounds').select('id, track_name, artist_name, avg_alignment_score').limit(1000),
  ]);

  if (chartsResult.error) return jsonError(chartsResult.error.message, 400);
  if (soundsResult.error) return jsonError(soundsResult.error.message, 400);

  const soundById = new Map((soundsResult.data || []).map((row) => [row.id, row]));

  const items = (chartsResult.data || []).map((row) => {
    const sound = soundById.get(row.sound_id || '');
    const engagementScore = Number(row.like_count || 0) + Number(row.comment_count || 0) * 2 + Number(row.lift_count || 0) * 5;
    const velocityScore = Number(row.velocity || 0);
    const alignmentScore = Number(sound?.avg_alignment_score || 0);
    const finalScore = Number(row.score || 0);

    return {
      sound_id: row.sound_id,
      track_name: sound?.track_name || '',
      artist_name: sound?.artist_name || '',
      engagement_score: Math.round(engagementScore * 100) / 100,
      velocity_score: Math.round(velocityScore * 100) / 100,
      alignment_score: Math.round(alignmentScore * 100) / 100,
      final_score: Math.round(finalScore * 100) / 100,
    };
  });

  items.sort((a, b) => b.final_score - a.final_score);

  return jsonOk({ items });
}
