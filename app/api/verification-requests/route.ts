import { createServiceRoleSupabase, requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';

type VerificationStatus = 'pending' | 'approved' | 'rejected';

export async function GET(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { data, error } = await auth.supabase
    .from('verification_requests')
    .select('id, full_name, reason, social_links, status, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) return jsonError(error.message, 400);

  return jsonOk({ items: data || [] });
}

export async function POST(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as {
    full_name?: string;
    reason?: string;
    social_links?: Record<string, string>;
  } | null;

  const fullName = body?.full_name?.trim();
  const reason = body?.reason?.trim();

  if (!fullName || fullName.length < 3) return jsonError('full_name is required', 400);
  if (!reason || reason.length < 10) return jsonError('reason must be at least 10 characters', 400);

  const { data, error } = await auth.supabase
    .from('verification_requests')
    .insert({
      user_id: auth.user.id,
      full_name: fullName,
      reason,
      social_links: body?.social_links || {},
      status: 'pending',
    })
    .select('id, user_id, full_name, reason, social_links, status, created_at')
    .single();

  if (error) return jsonError(error.message, 400);

  return jsonOk({ item: data }, 201);
}

export async function PATCH(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as {
    request_id?: string;
    status?: VerificationStatus;
  } | null;

  const requestId = body?.request_id?.trim();
  const status = body?.status;

  if (!requestId) return jsonError('request_id is required', 400);
  if (status !== 'approved' && status !== 'rejected' && status !== 'pending') {
    return jsonError('Invalid status', 400);
  }

  const { data: me, error: meError } = await auth.supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('id', auth.user.id)
    .single();

  if (meError) return jsonError(meError.message, 400);
  if (!me?.is_admin) return jsonError('Forbidden', 403);

  const admin = createServiceRoleSupabase();

  const { data: updated, error: updateError } = await admin
    .from('verification_requests')
    .update({ status })
    .eq('id', requestId)
    .select('id, user_id, status')
    .single();

  if (updateError) return jsonError(updateError.message, 400);

  if (status === 'approved') {
    await admin
      .from('profiles')
      .update({ is_verified: true, verified: true })
      .eq('id', updated.user_id);
  }

  if (status === 'rejected') {
    await admin
      .from('profiles')
      .update({ is_verified: false })
      .eq('id', updated.user_id);
  }

  return jsonOk({ item: updated });
}
