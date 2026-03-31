import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

const DAY_MS = 1000 * 60 * 60 * 24;

export async function GET(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const start7d = new Date(Date.now() - 7 * DAY_MS).toISOString();
  const start14d = new Date(Date.now() - 14 * DAY_MS).toISOString();

  const [usersResult, activeUsersResult, postsTodayResult, reportsPendingResult, postsLast7dResult, postsPrev7dResult] =
    await Promise.all([
      auth.admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      auth.admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      auth.admin.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', startOfToday),
      auth.admin.from('user_reports').select('id', { count: 'exact', head: true }).eq('admin_status', 'pending'),
      auth.admin.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', start7d),
      auth.admin.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', start14d).lt('created_at', start7d),
    ]);

  if (usersResult.error) return jsonError(usersResult.error.message, 400);
  if (activeUsersResult.error) return jsonError(activeUsersResult.error.message, 400);
  if (postsTodayResult.error) return jsonError(postsTodayResult.error.message, 400);
  if (reportsPendingResult.error) return jsonError(reportsPendingResult.error.message, 400);
  if (postsLast7dResult.error) return jsonError(postsLast7dResult.error.message, 400);
  if (postsPrev7dResult.error) return jsonError(postsPrev7dResult.error.message, 400);

  const allUsers = usersResult.data?.users || [];
  const activeUsers = (activeUsersResult.data?.users || []).filter((user) => {
    if (!user.last_sign_in_at) return false;
    const timestamp = new Date(user.last_sign_in_at).getTime();
    return Number.isFinite(timestamp) && Date.now() - timestamp <= 30 * DAY_MS;
  }).length;

  const usersLast7d = allUsers.filter((user) => {
    if (!user.created_at) return false;
    return new Date(user.created_at).getTime() >= Date.now() - 7 * DAY_MS;
  }).length;

  const usersPrev7d = allUsers.filter((user) => {
    if (!user.created_at) return false;
    const created = new Date(user.created_at).getTime();
    return created >= Date.now() - 14 * DAY_MS && created < Date.now() - 7 * DAY_MS;
  }).length;

  const postsLast7d = postsLast7dResult.count || 0;
  const postsPrev7d = postsPrev7dResult.count || 0;

  const growth = {
    users_growth_7d: usersPrev7d === 0 ? usersLast7d : Math.round(((usersLast7d - usersPrev7d) / usersPrev7d) * 100),
    posts_growth_7d: postsPrev7d === 0 ? postsLast7d : Math.round(((postsLast7d - postsPrev7d) / postsPrev7d) * 100),
  };

  return jsonOk({
    metrics: {
      total_users: allUsers.length,
      active_users: activeUsers,
      posts_today: postsTodayResult.count || 0,
      reports_pending: reportsPendingResult.count || 0,
    },
    growth,
  });
}
