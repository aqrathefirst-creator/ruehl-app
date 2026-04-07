import { jsonError, jsonOk } from '@/lib/server/responses';
import { requireAdminPermission } from '@/lib/requireAdminPermission';

export async function GET(request: Request) {
  const access = await requireAdminPermission(request.headers.get('authorization'), 'can_view_charts');
  if (!access.ok) return jsonError(access.error, access.status);

  const [postsResult, profilesResult, chartsResult] = await Promise.all([
    access.auth.admin
      .from('posts')
      .select('id, user_id, sound_id, likes_count, comments_count, alignment_score, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
    access.auth.admin.from('profiles').select('id, username').limit(2000),
    access.auth.admin.from('chart_scores').select('sound_id, score').not('sound_id', 'is', null).limit(2000),
  ]);

  if (postsResult.error) return jsonError(postsResult.error.message, 400);
  if (profilesResult.error) return jsonError(profilesResult.error.message, 400);
  if (chartsResult.error) return jsonError(chartsResult.error.message, 400);

  const usernameById = new Map((profilesResult.data || []).map((row) => [row.id, row.username || 'user']));
  const scoreBySoundId = new Map((chartsResult.data || []).map((row) => [row.sound_id, Number(row.score || 0)]));

  const items = (postsResult.data || []).map((post) => {
    const engagement = Number(post.likes_count || 0) + Number(post.comments_count || 0) * 2;
    const chartScore = Number(scoreBySoundId.get(post.sound_id || '') || 0);
    const contribution = Number((engagement * 0.7 + Number(post.alignment_score || 0) * 0.3) * (1 + chartScore / 1000));

    return {
      post_id: post.id,
      user: usernameById.get(post.user_id) || 'user',
      sound_id: post.sound_id,
      engagement,
      alignment_score: Number(post.alignment_score || 0),
      contribution_to_charts: Math.round(contribution * 100) / 100,
      created_at: post.created_at,
    };
  });

  return jsonOk({ items });
}
