import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

function getAuthTokenFromHeader(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const [type, token] = headerValue.split(' ');
  if (!type || !token) return null;
  if (type.toLowerCase() !== 'bearer') return null;
  return token;
}

export function createAuthedSupabase(authHeader: string | null) {
  const token = getAuthTokenFromHeader(authHeader);

  if (!token) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

type AuthFailure = {
  ok: false;
  error: string;
  status: 401;
};

type AuthSuccess = {
  ok: true;
  supabase: ReturnType<typeof createAuthedSupabase> extends infer T
    ? T extends null
      ? never
      : T
    : never;
  user: User;
};

export async function requireUser(authHeader: string | null) {
  const supabase = createAuthedSupabase(authHeader);
  if (!supabase) {
    return {
      ok: false,
      error: 'Missing or invalid authorization header',
      status: 401,
    } satisfies AuthFailure;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      ok: false,
      error: 'Unauthorized',
      status: 401,
    } satisfies AuthFailure;
  }

  return {
    ok: true,
    supabase,
    user: data.user,
  } satisfies AuthSuccess;
}

export function createServiceRoleSupabase() {
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
