import { jsonError, jsonOk } from '@/lib/server/responses';
import { requireAdminPermission } from '@/lib/requireAdminPermission';
import type { AdminRole } from '@/lib/adminRoles';

const ALLOWED_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'ANALYST', 'MODERATOR'];

export async function GET(request: Request) {
  const access = await requireAdminPermission(request.headers.get('authorization'), 'can_manage_system');
  if (!access.ok) return jsonError(access.error, access.status);

  const { data: adminRows, error: adminRowsError } = await access.auth.admin
    .from('admin_users')
    .select('id, email, first_name, last_name, employee_id, role, is_root_admin, created_at')
    .order('created_at', { ascending: true });

  const missingTable =
    adminRowsError &&
    (adminRowsError.code === '42P01' || /relation .*admin_users.* does not exist/i.test(adminRowsError.message || ''));

  if (adminRowsError && !missingTable) return jsonError(adminRowsError.message, 400);

  const items = ((adminRows || []) as Array<{
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    employee_id: string | null;
    role: AdminRole;
    is_root_admin: boolean | null;
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    employee_id: row.employee_id,
    role: row.role,
    is_root_admin: Boolean(row.is_root_admin),
    created_at: row.created_at,
  }));

  return jsonOk({
    current: {
      id: access.auth.user.id,
      role: access.role,
      permissions: access.permissions,
      is_root_admin: access.auth.profile.is_root_admin,
    },
    items,
    available_roles: ALLOWED_ROLES,
  });
}

export async function PATCH(request: Request) {
  const access = await requireAdminPermission(request.headers.get('authorization'), 'can_manage_system');
  if (!access.ok) return jsonError(access.error, access.status);
  if (access.role !== 'SUPER_ADMIN') return jsonError('Access Restricted', 403);

  const body = (await request.json().catch(() => null)) as { id?: string; role?: AdminRole } | null;
  const id = body?.id?.trim();
  const role = body?.role;

  if (!id || !role) return jsonError('id and role are required', 400);
  if (!ALLOWED_ROLES.includes(role)) return jsonError('Invalid role', 400);

  if (role === 'SUPER_ADMIN' && !access.auth.profile.is_root_admin) {
    return jsonError('Only ROOT can assign SUPER_ADMIN', 403);
  }

  const { data: targetAdmin, error: targetError } = await access.auth.admin
    .from('admin_users')
    .select('id, role, is_root_admin')
    .eq('id', id)
    .maybeSingle();

  if (targetError) return jsonError(targetError.message, 400);
  if (!targetAdmin) return jsonError('Admin user not found', 404);
  if (targetAdmin.is_root_admin) return jsonError('Protected ROOT admin cannot be modified via UI', 403);
  if (targetAdmin.role === 'SUPER_ADMIN' && !access.auth.profile.is_root_admin) {
    return jsonError('Only ROOT can modify SUPER_ADMIN users', 403);
  }

  const { error } = await access.auth.admin
    .from('admin_users')
    .update({ role })
    .eq('id', id);

  const missingTable = error && (error.code === '42P01' || /relation .*admin_users.* does not exist/i.test(error.message || ''));
  if (missingTable) return jsonError('admin_users table is not migrated yet. Run Supabase migrations first.', 400);
  if (error) return jsonError(error.message, 400);

  await access.auth.admin.from('users').update({ is_admin: true }).eq('id', id);
  await access.auth.admin.from('profiles').update({ is_verified: true, verified: true }).eq('id', id);

  return jsonOk({ success: true });
}

export async function DELETE(request: Request) {
  const access = await requireAdminPermission(request.headers.get('authorization'), 'can_manage_system');
  if (!access.ok) return jsonError(access.error, access.status);
  if (access.role !== 'SUPER_ADMIN') return jsonError('Access Restricted', 403);

  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim();
  if (!id) return jsonError('id is required', 400);

  const { data: targetAdmin, error: targetError } = await access.auth.admin
    .from('admin_users')
    .select('id, role, is_root_admin')
    .eq('id', id)
    .maybeSingle();

  if (targetError) return jsonError(targetError.message, 400);
  if (!targetAdmin) return jsonError('Admin user not found', 404);
  if (targetAdmin.is_root_admin) return jsonError('Protected ROOT admin cannot be deleted via UI', 403);
  if (targetAdmin.role === 'SUPER_ADMIN' && !access.auth.profile.is_root_admin) {
    return jsonError('Only ROOT can remove SUPER_ADMIN users', 403);
  }

  const { error } = await access.auth.admin.from('admin_users').delete().eq('id', id);
  const missingTable = error && (error.code === '42P01' || /relation .*admin_users.* does not exist/i.test(error.message || ''));
  if (missingTable) return jsonError('admin_users table is not migrated yet. Run Supabase migrations first.', 400);
  if (error) return jsonError(error.message, 400);

  await access.auth.admin.from('users').update({ is_admin: false }).eq('id', id);

  return jsonOk({ success: true });
}
