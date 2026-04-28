import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

type ProfileListRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  badge_verification_status: string | null;
  shadow_banned: boolean | null;
  suspended_until: string | null;
};

type UsersListRow = {
  id: string;
  is_admin: boolean | null;
  account_type: string | null;
};

export async function GET(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const query = url.searchParams.get('query')?.trim().toLowerCase() || '';
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || '20')));
  const accountTypeFilter = (url.searchParams.get('accountType') || 'all').trim().toLowerCase();
  const badgeFilter = (url.searchParams.get('badgeVerification') || 'all').trim().toLowerCase();

  const [{ data: listedUsers, error: usersError }, { count: postsCount, error: postsError }] = await Promise.all([
    auth.admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    auth.admin.from('posts').select('id', { count: 'exact', head: true }),
  ]);

  if (usersError) return jsonError(usersError.message, 400);
  if (postsError) return jsonError(postsError.message, 400);

  const authUsers = listedUsers?.users || [];
  const userIds = authUsers.map((user) => user.id);

  const [{ data: profiles, error: profilesError }, { data: userRows, error: usersRowError }] =
    userIds.length > 0
      ? await Promise.all([
          auth.admin
            .from('profiles')
            .select(
              'id, username, avatar_url, is_verified, shadow_banned, suspended_until, badge_verification_status',
            )
            .in('id', userIds),
          auth.admin.from('users').select('id, is_admin, account_type').in('id', userIds),
        ])
      : [{ data: [] as ProfileListRow[], error: null }, { data: [] as UsersListRow[], error: null }];

  if (profilesError) return jsonError(profilesError.message, 400);
  if (usersRowError) return jsonError(usersRowError.message, 400);

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const usersById = new Map((userRows || []).map((row) => [row.id, row]));

  let merged = authUsers.map((user) => {
    const profile = profileMap.get(user.id);
    const platformUser = usersById.get(user.id);
    return {
      id: user.id,
      username: profile?.username ?? null,
      email: user.email || null,
      phone: user.phone || null,
      avatar_url: profile?.avatar_url ?? null,
      is_verified: profile?.is_verified ?? false,
      account_type: platformUser?.account_type ?? null,
      badge_verification_status: profile?.badge_verification_status ?? null,
      is_admin: platformUser?.is_admin === true,
      shadow_banned: profile?.shadow_banned ?? false,
      suspended_until: profile?.suspended_until ?? null,
      created_at: user.created_at || null,
      last_sign_in_at: user.last_sign_in_at || null,
    };
  });

  const textFiltered = query
    ? merged.filter((user) => {
        const username = user.username?.toLowerCase() || '';
        const email = user.email?.toLowerCase() || '';
        const phone = user.phone?.toLowerCase() || '';
        return username.includes(query) || email.includes(query) || phone.includes(query);
      })
    : merged;

  let typeFiltered = textFiltered;
  if (accountTypeFilter !== 'all' && ['personal', 'business', 'media'].includes(accountTypeFilter)) {
    typeFiltered = textFiltered.filter(
      (u) => String(u.account_type || '').toLowerCase() === accountTypeFilter,
    );
  }

  let badgeFiltered = typeFiltered;
  if (badgeFilter !== 'all') {
    if (badgeFilter === 'none') {
      badgeFiltered = typeFiltered.filter((u) => !u.badge_verification_status);
    } else if (['pending', 'approved', 'rejected'].includes(badgeFilter)) {
      badgeFiltered = typeFiltered.filter((u) => String(u.badge_verification_status || '').toLowerCase() === badgeFilter);
    }
  }

  const total = badgeFiltered.length;
  const start = (page - 1) * pageSize;
  const items = badgeFiltered.slice(start, start + pageSize);

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
