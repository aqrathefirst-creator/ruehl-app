import { jsonError, jsonOk } from '@/lib/server/responses';
import { requireAdminPermission } from '@/lib/requireAdminPermission';
import { executeRequest, type GovernedRequestSubject } from '@/lib/admin/executeRequest';

type RequestStatus = 'pending' | 'approved' | 'rejected';


export async function GET(request: Request) {
  const access = await requireAdminPermission(request.headers.get('authorization'), 'can_submit_requests');
  if (!access.ok) return jsonError(access.error, access.status);

  const status = (new URL(request.url).searchParams.get('status') || 'all').trim().toLowerCase();
  let query = access.auth.admin
    .from('admin_requests')
    .select('id, admin_id, submitted_by, subject, target_id, target, notes, attachment_url, status, reviewed_by, created_at, reviewed_at')
    .order('created_at', { ascending: false })
    .limit(500);

  if (status === 'pending' || status === 'approved' || status === 'rejected') {
    query = query.eq('status', status as RequestStatus);
  }

  const { data, error } = await query;
  if (error) return jsonError(error.message, 400);

  return jsonOk({
    current_role: access.role,
    can_review: access.permissions.includes('can_review_requests'),
    items: data || [],
  });
}

export async function POST(request: Request) {
  const access = await requireAdminPermission(request.headers.get('authorization'), 'can_submit_requests');
  if (!access.ok) return jsonError(access.error, access.status);

  const body = (await request.json().catch(() => null)) as {
    subject?: GovernedRequestSubject;
    target?: string;
    target_id?: string;
    notes?: string;
    attachment_url?: string | null;
  } | null;

  const subject = body?.subject;
  const targetId = body?.target_id?.trim() || body?.target?.trim() || '';
  const notes = body?.notes?.trim() || '';
  const attachmentUrl = body?.attachment_url?.trim() || null;

  if (!subject) return jsonError('subject is required', 400);
  if (!targetId) return jsonError('target_id is required', 400);
  if (!notes) return jsonError('notes are required', 400);

  const { data, error } = await access.auth.admin
    .from('admin_requests')
    .insert({
      admin_id: access.auth.user.id,
      submitted_by: access.auth.user.id,
      subject,
      target_id: targetId,
      target: targetId,
      notes,
      attachment_url: attachmentUrl,
      status: 'pending',
    })
    .select('id, admin_id, submitted_by, subject, target_id, target, notes, attachment_url, status, reviewed_by, created_at, reviewed_at')
    .single();

  if (error) return jsonError(error.message, 400);

  return jsonOk({ item: data }, 201);
}

export async function PATCH(request: Request) {
  const access = await requireAdminPermission(request.headers.get('authorization'), 'can_review_requests');
  if (!access.ok) return jsonError(access.error, access.status);
  if (!access.auth.profile.is_root_admin) return jsonError('Only root admin can approve or reject requests', 403);

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    status?: RequestStatus;
  } | null;

  const id = body?.id?.trim();
  const status = body?.status;

  if (!id || !status || (status !== 'approved' && status !== 'rejected')) {
    return jsonError('id and valid status are required', 400);
  }

  const { data: requestRow, error: readError } = await access.auth.admin
    .from('admin_requests')
    .select('id, subject, target_id, target, notes, status')
    .eq('id', id)
    .maybeSingle();

  if (readError) return jsonError(readError.message, 400);
  if (!requestRow) return jsonError('Request not found', 404);
  if (requestRow.status !== 'pending') return jsonError('Request already reviewed', 400);

  if (status === 'approved') {
    await executeRequest({
      admin: access.auth.admin,
      requestId: requestRow.id,
      reviewerAdminId: access.auth.user.id,
      subject: requestRow.subject as GovernedRequestSubject,
      targetId: requestRow.target_id || requestRow.target || '',
      notes: requestRow.notes || null,
    });
  }

  const { error } = await access.auth.admin
    .from('admin_requests')
    .update({
      status,
      reviewed_by: access.auth.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return jsonError(error.message, 400);

  return jsonOk({ success: true });
}
