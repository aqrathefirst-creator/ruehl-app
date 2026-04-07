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

export async function requireAdmin(authHeader: string | null) {
  const auth = await requireUser(authHeader);
  if (!auth.ok) {
    return auth satisfies AdminFailure;
  }

  const admin = createServiceRoleSupabase();

  const { data: adminProfile, error } = await admin
    .from('admin_users')
    .select('id, email, first_name, last_name, employee_id, role, is_root_admin, created_at')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error: error.message,
      status: 403,
    } satisfies AdminFailure;
  }

  if (!adminProfile) {
    return {
      ok: false,
      error: 'Unauthorized',
      status: 403,
    } satisfies AdminFailure;
  }

  return {
    ok: true,
    user: auth.user,
    supabase: auth.supabase,
    admin,
    profile: {
      id: adminProfile.id,
      email: adminProfile.email,
      first_name: adminProfile.first_name,
      last_name: adminProfile.last_name,
      employee_id: adminProfile.employee_id,
      role: adminProfile.role as AdminRole,
      is_root_admin: Boolean(adminProfile.is_root_admin),
      created_at: adminProfile.created_at,
    },
  } satisfies AdminSuccess;
}
