import type { User } from '@supabase/supabase-js';
import { createServiceRoleSupabase, requireUser } from '@/lib/server/supabase';

type AdminFailure = {
  ok: false;
  error: string;
  status: 401 | 403;
};

type AdminSuccess = {
  ok: true;
  user: User;
  supabase: NonNullable<ReturnType<typeof createServiceRoleSupabase>>;
  admin: ReturnType<typeof createServiceRoleSupabase>;
};

export async function requireAdmin(authHeader: string | null) {
  const auth = await requireUser(authHeader);
  if (!auth.ok) {
    return auth satisfies AdminFailure;
  }

  const { data: me, error } = await auth.supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('id', auth.user.id)
    .single();

  if (error) {
    return {
      ok: false,
      error: error.message,
      status: 403,
    } satisfies AdminFailure;
  }

  if (!me?.is_admin) {
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
    admin: createServiceRoleSupabase(),
  } satisfies AdminSuccess;
}