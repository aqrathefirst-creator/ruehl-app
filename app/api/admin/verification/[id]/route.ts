import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

type Body = {
  status?: 'approved' | 'rejected';
  rejection_reason?: string | null;
};

/**
 * Approve or reject a pending verification submission.
 * DB trigger syncs `profiles` / `users` `badge_verification_status` — do not duplicate here.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { id } = await params;
  const submissionId = id?.trim();
  if (!submissionId) return jsonError('id is required', 400);

  const body = (await request.json().catch(() => null)) as Body | null;
  const status = body?.status;
  if (status !== 'approved' && status !== 'rejected') {
    return jsonError('status must be approved or rejected', 400);
  }

  if (status === 'rejected') {
    const reason = String(body?.rejection_reason ?? '').trim();
    if (!reason) return jsonError('rejection_reason is required when rejecting', 400);
  }

  const { data: existing, error: fetchErr } = await auth.admin
    .from('verification_submissions')
    .select('id, status')
    .eq('id', submissionId)
    .maybeSingle();

  if (fetchErr) return jsonError(fetchErr.message, 400);
  if (!existing) return jsonError('Submission not found', 404);
  if (existing.status !== 'pending') return jsonError('Submission is no longer pending', 400);

  const reviewedAt = new Date().toISOString();
  const updatePayload = {
    status,
    reviewed_at: reviewedAt,
    reviewed_by: auth.user.id,
    rejection_reason: status === 'rejected' ? String(body?.rejection_reason ?? '').trim() : null,
  };

  const { data: updated, error: updateErr } = await auth.admin
    .from('verification_submissions')
    .update(updatePayload)
    .eq('id', submissionId)
    .select('id, user_id, status, reviewed_at, reviewed_by, rejection_reason')
    .maybeSingle();

  if (updateErr) return jsonError(updateErr.message, 400);

  return jsonOk({ item: updated });
}
