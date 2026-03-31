import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

type AdminUserRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  is_admin: boolean | null;
  shadow_banned: boolean | null;
  suspended_until: string | null;
};

export async function GET(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const query = url.searchParams.get('query')?.trim().toLowerCase() || '';
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || '20')));

  const [{ data: listedUsers, error: usersError }, { count: postsCount, error: postsError }] = await Promise.all([
    auth.admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    auth.admin.from('posts').select('id', { count: 'exact', head: true }),
  ]);

  if (usersError) return jsonError(usersError.message, 400);
  if (postsError) return jsonError(postsError.message, 400);

  const authUsers = listedUsers?.users || [];
  const userIds = authUsers.map((user) => user.id);

  const { data: profiles, error: profilesError } = userIds.length > 0
    ? await auth.admin
        .from('profiles')
      .select('id, username, avatar_url, is_verified, is_admin, shadow_banned, suspended_until')
        .in('id', userIds)
    : { data: [] as AdminUserRow[], error: null };

  if (profilesError) return jsonError(profilesError.message, 400);

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));

  const merged = authUsers.map((user) => {
    const profile = profileMap.get(user.id);
    return {
      id: user.id,
      username: profile?.username || null,
      email: user.email || null,
      phone: user.phone || null,
      avatar_url: profile?.avatar_url || null,
      is_verified: profile?.is_verified ?? false,
      is_admin: profile?.is_admin ?? false,
      shadow_banned: profile?.shadow_banned ?? false,
      suspended_until: profile?.suspended_until ?? null,
      created_at: user.created_at || null,
      last_sign_in_at: user.last_sign_in_at || null,
    };
  });

  const filtered = query
    ? merged.filter((user) => {
        const username = user.username?.toLowerCase() || '';
        const email = user.email?.toLowerCase() || '';
        const phone = user.phone?.toLowerCase() || '';
        return username.includes(query) || email.includes(query) || phone.includes(query);
      })
    : merged;

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);
  const activeUsers = merged.filter((user) => {
    if (!user.last_sign_in_at) return false;
    const lastSeen = new Date(user.last_sign_in_at).getTime();
    return Number.isFinite(lastSeen) && Date.now() - lastSeen <= 1000 * 60 * 60 * 24 * 30;
  }).length;

  return jsonOk({
    overview: {
      total_users: merged.length,
      total_posts: postsCount || 0,
      active_users: activeUsers,
    },
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}