import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';
import { mapVerificationSubmissionRow } from '@/lib/ruehl/queries/verificationServer';

/**
 * User-facing verification submissions (`verification_submissions`).
 * Replaces legacy `verification_requests` (dropped by native migration).
 */
export async function GET(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { data, error } = await auth.supabase
    .from('verification_submissions')
    .select(
      'id, user_id, account_type, account_subtype, legal_entity_name, website_url, user_notes, document_path, status, rejection_reason, submitted_at, reviewed_at, reviewed_by',
    )
    .eq('user_id', auth.user.id)
    .order('submitted_at', { ascending: false });

  if (error) return jsonError(error.message, 400);

  return jsonOk({ items: data || [] });
}

export async function POST(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as {
    account_type?: string;
    account_subtype?: string;
    legal_entity_name?: string;
    website_url?: string | null;
    user_notes?: string | null;
    document_path?: string;
  } | null;

  const accountType = body?.account_type?.trim();
  const accountSubtype = body?.account_subtype?.trim();
  const legalEntityName = body?.legal_entity_name?.trim();
  const documentPath = body?.document_path?.trim();

  if (!accountType || !['business', 'media'].includes(accountType)) {
    return jsonError('account_type must be business or media', 400);
  }
  if (!accountSubtype || accountSubtype.length < 2) {
    return jsonError('account_subtype is required', 400);
  }
  if (!legalEntityName || legalEntityName.length < 2) {
    return jsonError('legal_entity_name is required', 400);
  }
  if (!documentPath || documentPath.length < 4) {
    return jsonError(
      'document_path is required — upload document(s) to the verification-documents bucket first',
      400,
    );
  }

  const { data: pendingRow } = await auth.supabase
    .from('verification_submissions')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingRow?.id) {
    return jsonError('A submission is already under review', 409);
  }

  const { data: approvedRow } = await auth.supabase
    .from('verification_submissions')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('status', 'approved')
    .maybeSingle();

  if (approvedRow?.id) {
    return jsonError('Your account is already verified', 409);
  }

  const { data, error } = await auth.supabase
    .from('verification_submissions')
    .insert({
      user_id: auth.user.id,
      account_type: accountType,
      account_subtype: accountSubtype,
      legal_entity_name: legalEntityName,
      website_url: body?.website_url?.trim() || null,
      user_notes: body?.user_notes?.trim() || null,
      document_path: documentPath,
      status: 'pending',
    })
    .select(
      'id, user_id, account_type, account_subtype, legal_entity_name, website_url, user_notes, document_path, status, rejection_reason, submitted_at, reviewed_at, reviewed_by',
    )
    .single();

  if (error) return jsonError(error.message, 400);

  const item = mapVerificationSubmissionRow(data as Record<string, unknown>);
  return jsonOk({ item }, 201);
}
