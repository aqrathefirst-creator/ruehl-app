import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';
import type { VerificationSubmission, VerificationStatus } from '@/lib/ruehl/verification';

export type VerificationQueueItem = VerificationSubmission & {
  username: string | null;
  /** From `profiles.badge_verification_status` at queue load time (for admin badge display). */
  profileBadgeVerificationStatus: string | null;
};

function mapSubmissionRow(
  row: Record<string, unknown>,
  username: string | null,
  profileBadgeVerificationStatus: string | null,
): VerificationQueueItem {
  const base: VerificationSubmission = {
    id: String(row.id),
    userId: String(row.user_id),
    accountType: (row.account_type as 'business' | 'media') || 'business',
    accountCategory: String(row.account_category || ''),
    legalEntityName: String(row.legal_entity_name || ''),
    websiteUrl: row.website_url == null ? null : String(row.website_url),
    userNotes: row.user_notes == null ? null : String(row.user_notes),
    documentPath: String(row.document_path || ''),
    status: row.status as VerificationStatus,
    rejectionReason: row.rejection_reason == null ? null : String(row.rejection_reason),
    submittedAt: String(row.submitted_at || ''),
    reviewedAt: row.reviewed_at == null ? null : String(row.reviewed_at),
    reviewedBy: row.reviewed_by == null ? null : String(row.reviewed_by),
  };
  return { ...base, username, profileBadgeVerificationStatus };
}

/** Admin queue: pending verification submissions (`verification_submissions`). */
export async function GET(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const status = url.searchParams.get('status')?.trim();

  let q = auth.admin
    .from('verification_submissions')
    .select(
      'id, user_id, account_type, account_category, legal_entity_name, website_url, user_notes, document_path, status, rejection_reason, submitted_at, reviewed_at, reviewed_by',
    )
    .order('submitted_at', { ascending: false });

  if (status) {
    q = q.eq('status', status);
  }

  const { data: rows, error } = await q;
  if (error) return jsonError(error.message, 400);

  const list = (rows || []) as Record<string, unknown>[];
  const userIds = [...new Set(list.map((r) => String(r.user_id)))];
  const usernameByUserId = new Map<string, string | null>();
  const badgeByUserId = new Map<string, string | null>();

  if (userIds.length > 0) {
    const { data: profiles, error: pe } = await auth.admin
      .from('profiles')
      .select('id, username, badge_verification_status')
      .in('id', userIds);
    if (pe) return jsonError(pe.message, 400);
    for (const p of profiles || []) {
      const row = p as { id?: string; username?: string | null; badge_verification_status?: string | null };
      if (row.id) {
        usernameByUserId.set(row.id, row.username ?? null);
        badgeByUserId.set(row.id, row.badge_verification_status ?? null);
      }
    }
  }

  const items: VerificationQueueItem[] = list.map((row) =>
    mapSubmissionRow(
      row,
      usernameByUserId.get(String(row.user_id)) ?? null,
      badgeByUserId.get(String(row.user_id)) ?? null,
    ),
  );

  return jsonOk({ items });
}
