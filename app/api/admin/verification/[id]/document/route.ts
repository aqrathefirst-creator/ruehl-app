import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

const EXPIRES_SEC = 300;

/** Short-lived signed URL for private `verification-documents` preview (admin only). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(_request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { id } = await params;
  const submissionId = id?.trim();
  if (!submissionId) return jsonError('id is required', 400);

  const { data: row, error: rowErr } = await auth.admin
    .from('verification_submissions')
    .select('id, document_path')
    .eq('id', submissionId)
    .maybeSingle();

  if (rowErr) return jsonError(rowErr.message, 400);
  if (!row?.document_path) return jsonError('Submission or document not found', 404);

  const path = String(row.document_path);

  const { data: signed, error: signErr } = await auth.admin.storage
    .from('verification-documents')
    .createSignedUrl(path, EXPIRES_SEC);

  if (signErr) return jsonError(signErr.message, 400);
  if (!signed?.signedUrl) return jsonError('Unable to create signed URL', 500);

  return jsonOk({ signedUrl: signed.signedUrl, expiresIn: EXPIRES_SEC });
}
