import { randomBytes } from 'crypto';
import { jsonError, jsonOk } from '@/lib/server/responses';
import { requireAdminPermission } from '@/lib/requireAdminPermission';
import { generateEmployeeId } from '@/lib/admin/generateEmployeeId';
import type { AdminRole } from '@/lib/adminRoles';

const ALLOWED_ROLES: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'ANALYST', 'MODERATOR'];

function parseRootAllowlist(): string[] {
  const raw = process.env.ADMIN_ROOT_ALLOWLIST || '';
  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function isEmailAllowed(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (normalized.endsWith('@ruehl.app')) return true;

  const rootAllowlist = parseRootAllowlist();
  return rootAllowlist.includes(normalized);
}

function generateTemporaryPassword() {
  return randomBytes(18).toString('base64url');
}

export async function POST(request: Request) {
  const access = await requireAdminPermission(request.headers.get('authorization'), 'can_manage_system');
  if (!access.ok) return jsonError(access.error, access.status);

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    first_name?: string;
    last_name?: string;
    role?: AdminRole;
  } | null;

  const email = body?.email?.trim().toLowerCase() || '';
  const firstName = body?.first_name?.trim() || '';
  const lastName = body?.last_name?.trim() || '';
  const role = body?.role;

  if (!email || !firstName || !lastName || !role) {
    return jsonError('email, first_name, last_name, and role are required', 400);
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return jsonError('Invalid role', 400);
  }

  if (!isEmailAllowed(email)) {
    return jsonError('Only @ruehl.app emails are allowed', 400);
  }

  const isRootAllowlistedEmail = !email.endsWith('@ruehl.app');
  if (isRootAllowlistedEmail && !access.auth.profile.is_root_admin) {
    return jsonError('Only ROOT can create allowlisted emergency admins', 403);
  }

  if (role === 'SUPER_ADMIN' && !access.auth.profile.is_root_admin) {
    return jsonError('Only ROOT can assign SUPER_ADMIN', 403);
  }

  const temporaryPassword = generateTemporaryPassword();

  const { data: createdAuthUser, error: createUserError } = await access.auth.admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
  });

  if (createUserError || !createdAuthUser.user?.id) {
    return jsonError(createUserError?.message || 'Failed to create auth user', 400);
  }

  try {
    const employeeId = await generateEmployeeId(access.auth.admin, { isRootAdmin: false });

    const { error: insertError } = await access.auth.admin.from('admin_users').insert({
      id: createdAuthUser.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      employee_id: employeeId,
      role,
      is_root_admin: false,
    });

    if (insertError) {
      throw new Error(insertError.message || 'Failed to create admin profile');
    }

    await access.auth.admin
      .from('profiles')
      .update({ is_admin: true, is_verified: true, verified: true })
      .eq('id', createdAuthUser.user.id);

    return jsonOk({
      success: true,
      admin: {
        id: createdAuthUser.user.id,
        employee_id: employeeId,
        email,
        role,
      },
      temporary_password: temporaryPassword,
    });
  } catch (error: unknown) {
    await access.auth.admin.auth.admin.deleteUser(createdAuthUser.user.id);
    return jsonError(error instanceof Error ? error.message : 'Failed to create admin', 400);
  }
}
