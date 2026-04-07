import { hasAdminPermission, type AdminPermission, type AdminRole, getRolePermissions } from '@/lib/adminRoles';
import { requireAdmin } from '@/lib/server/admin';

type PermissionFailure = {
  ok: false;
  error: string;
  status: 401 | 403;
};

type PermissionSuccess = {
  ok: true;
  auth: Awaited<ReturnType<typeof requireAdmin>> & { ok: true };
  role: AdminRole;
  permissions: AdminPermission[];
};

export async function requireAdminPermission(authHeader: string | null, permission: AdminPermission) {
  const auth = await requireAdmin(authHeader);
  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error,
      status: auth.status,
    } satisfies PermissionFailure;
  }

  const role = auth.profile.role as AdminRole;

  if (!hasAdminPermission(role, permission)) {
    return {
      ok: false,
      error: 'Access Restricted',
      status: 403,
    } satisfies PermissionFailure;
  }

  return {
    ok: true,
    auth,
    role,
    permissions: getRolePermissions(role),
  } satisfies PermissionSuccess;
}
