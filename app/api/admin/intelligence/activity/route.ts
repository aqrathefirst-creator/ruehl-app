import { jsonError, jsonOk } from '@/lib/server/responses';
import { requireAdminPermission } from '@/lib/requireAdminPermission';

export async function GET(request: Request) {
  const access = await requireAdminPermission(request.headers.get('authorization'), 'can_view_charts');
  if (!access.ok) return jsonError(access.error, access.status);

  const now = Date.now();
  const lastHourIso = new Date(now - 60 * 60 * 1000).toISOString();
  const last30Iso = new Date(now - 30 * 60 * 1000).toISOString();
  const prev30Iso = new Date(now - 60 * 60 * 1000).toISOString();

  const [postsHourResult, posts30Result, postsPrev30Result] = await Promise.all([
    access.auth.admin.from('posts').select('id, sound_id, user_id, created_at').gte('created_at', lastHourIso).limit(20000),
    access.auth.admin.from('posts').select('id, sound_id').gte('created_at', last30Iso).limit(20000),
    access.auth.admin.from('posts').select('id, sound_id').gte('created_at', prev30Iso).lt('created_at', last30Iso).limit(20000),
  ]);

  if (postsHourResult.error) return jsonError(postsHourResult.error.message, 400);
  if (posts30Result.error) return jsonError(posts30Result.error.message, 400);
  if (postsPrev30Result.error) return jsonError(postsPrev30Result.error.message, 400);

  const postsPerMinute = Math.round(((postsHourResult.data || []).length / 60) * 100) / 100;

  const countBySound = (rows: Array<{ sound_id?: string | null }>) =>
    rows.reduce<Record<string, number>>((acc, row) => {
      const soundId = row.sound_id || '';
      if (!soundId) return acc;
      acc[soundId] = (acc[soundId] || 0) + 1;
      return acc;
    }, {});

  const current30 = countBySound((posts30Result.data || []) as Array<{ sound_id?: string | null }>);
  const previous30 = countBySound((postsPrev30Result.data || []) as Array<{ sound_id?: string | null }>);

  const spikes = Object.entries(current30)
    .map(([sound_id, count]) => {
      const previous = previous30[sound_id] || 0;
      const spike_ratio = previous === 0 ? count : count / Math.max(previous, 1);
      return {
        sound_id,
        current_count: count,
        previous_count: previous,
        spike_ratio: Math.round(spike_ratio * 100) / 100,
      };
    })
    .filter((row) => row.spike_ratio >= 2 || row.current_count >= 8)
    .sort((a, b) => b.spike_ratio - a.spike_ratio)
    .slice(0, 20);

  const byUser = ((postsHourResult.data || []) as Array<{ user_id?: string | null }>).reduce<Record<string, number>>((acc, row) => {
    const userId = row.user_id || '';
    if (!userId) return acc;
    acc[userId] = (acc[userId] || 0) + 1;
    return acc;
  }, {});

  const abnormal = Object.entries(byUser)
    .filter(([, count]) => count >= 8)
    .map(([user_id, post_count]) => ({ user_id, post_count }))
    .sort((a, b) => b.post_count - a.post_count)
    .slice(0, 20);

  return jsonOk({
    posts_per_minute: postsPerMinute,
    sound_usage_spikes: spikes,
    abnormal_activity: abnormal,
    sampled_at: new Date().toISOString(),
  });
}
