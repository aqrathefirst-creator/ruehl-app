import type { User } from '@supabase/supabase-js';
import type { AdminRole } from '@/lib/adminRoles';
import { createServiceRoleSupabase, requireUser } from '@/lib/server/supabase';

export type AdminProfile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  employee_id: string | null;
  role: AdminRole;
  is_root_admin: boolean;
  created_at: string;
};

type AdminFailure = {
  ok: false;
  error: string;
  status: 401 | 403;
};

type AdminSuccess = {
  ok: true;
  user: User;
  supabase: Extract<Awaited<ReturnType<typeof requireUser>>, { ok: true }>['supabase'];
  admin: ReturnType<typeof createServiceRoleSupabase>;
  profile: AdminProfile;
};

type InstitutionalRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  employee_id: string | null;
  role: string;
  is_root_admin: boolean | null;
  created_at: string;
};

function mapInstitutionalRow(row: InstitutionalRow): AdminProfile {
  return {
    id: row.id,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    employee_id: row.employee_id,
    role: row.role as AdminRole,
    is_root_admin: Boolean(row.is_root_admin),
    created_at: row.created_at,
  };
}

/** When `users.is_admin` is set but the user is not in `admin_users`, use a platform-admin profile. */
function syntheticPlatformAdminProfile(user: User): AdminProfile {
  return {
    id: user.id,
    email: user.email ?? null,
    first_name: null,
    last_name: null,
    employee_id: null,
    role: 'SUPER_ADMIN',
    is_root_admin: true,
    created_at: new Date(0).toISOString(),
  };
}

export async function requireAdmin(authHeader: string | null) {
  const auth = await requireUser(authHeader);
  if (!auth.ok) {
    return auth satisfies AdminFailure;
  }

  const admin = createServiceRoleSupabase();

  const { data: platformUser, error: puErr } = await admin
    .from('users')
    .select('is_admin')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (puErr) {
    return {
      ok: false,
      error: puErr.message,
      status: 403,
    } satisfies AdminFailure;
  }

  const { data: institutionalRow } = await admin
    .from('admin_users')
    .select('id, email, first_name, last_name, employee_id, role, is_root_admin, created_at')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (platformUser?.is_admin === true) {
    const profile = institutionalRow
      ? mapInstitutionalRow(institutionalRow as InstitutionalRow)
      : syntheticPlatformAdminProfile(auth.user);
    return {
      ok: true,
      user: auth.user,
      supabase: auth.supabase,
      admin,
      profile,
    } satisfies AdminSuccess;
  }

  if (institutionalRow) {
    return {
      ok: true,
      user: auth.user,
      supabase: auth.supabase,
      admin,
      profile: mapInstitutionalRow(institutionalRow as InstitutionalRow),
    } satisfies AdminSuccess;
  }

  return {
    ok: false,
    error: 'Unauthorized',
    status: 403,
  } satisfies AdminFailure;
}
