import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

type VerificationStatus = 'approved' | 'rejected';

export async function GET(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const status = url.searchParams.get('status')?.trim();

  let query = auth.admin
    .from('verification_requests')
    .select('id, user_id, full_name, reason, social_links, status, created_at')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return jsonError(error.message, 400);

  return jsonOk({ items: data || [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as {
    request_id?: string;
    user_id?: string;
    status?: VerificationStatus;
  } | null;

  const requestId = body?.request_id?.trim();
  const userId = body?.user_id?.trim();
  const status = body?.status;

  if (!requestId) return jsonError('request_id is required', 400);
  if (!userId) return jsonError('user_id is required', 400);
  if (status !== 'approved' && status !== 'rejected') return jsonError('Invalid status', 400);

  const notes = `Verification decision requested from moderation queue ${requestId}. Proposed status: ${status}.`;

  const { error: insertError } = await auth.admin
    .from('admin_requests')
    .insert({
      admin_id: auth.user.id,
      submitted_by: auth.user.id,
      subject: 'VERIFY_USER',
      target_id: userId,
      target: userId,
      notes,
      status: 'pending',
    });

  if (insertError) return jsonError(insertError.message, 400);

  return jsonOk({ success: true, message: 'Request submitted for approval' });
}