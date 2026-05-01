/**
 * Server-side verification submission reads (`verification_submissions`).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { VerificationStatus } from '@/lib/ruehl/verification';

export type VerificationSubmissionRecord = {
  id: string;
  user_id: string;
  account_type: string;
  account_subtype: string;
  legal_entity_name: string;
  website_url: string | null;
  user_notes: string | null;
  /** Storage object path(s); multiple uploads joined with "|" per Path D web convention */
  document_path: string;
  status: VerificationStatus;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

function parseStatus(raw: unknown): VerificationStatus {
  if (raw === 'pending' || raw === 'approved' || raw === 'rejected') return raw;
  return 'pending';
}

export function mapVerificationSubmissionRow(row: Record<string, unknown>): VerificationSubmissionRecord {
  return {
    id: String(row.id ?? ''),
    user_id: String(row.user_id ?? ''),
    account_type: String(row.account_type ?? ''),
    account_subtype: String(row.account_subtype ?? ''),
    legal_entity_name: String(row.legal_entity_name ?? ''),
    website_url: row.website_url == null ? null : String(row.website_url),
    user_notes: row.user_notes == null ? null : String(row.user_notes),
    document_path: String(row.document_path ?? ''),
    status: parseStatus(row.status),
    rejection_reason: row.rejection_reason == null ? null : String(row.rejection_reason),
    submitted_at: row.submitted_at == null ? '' : String(row.submitted_at),
    reviewed_at: row.reviewed_at == null ? null : String(row.reviewed_at),
  };
}

/** Latest submission row for the user (including historical rejects). */
export async function getLatestVerificationSubmission(
  userId: string,
  client: SupabaseClient,
): Promise<VerificationSubmissionRecord | null> {
  const uid = String(userId || '').trim();
  if (!uid) return null;

  const { data, error } = await client
    .from('verification_submissions')
    .select(
      'id, user_id, account_type, account_subtype, legal_entity_name, website_url, user_notes, document_path, status, rejection_reason, submitted_at, reviewed_at',
    )
    .eq('user_id', uid)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error && process.env.NODE_ENV === 'development') {
      console.warn('[verificationServer]', error.message);
    }
    return null;
  }

  return mapVerificationSubmissionRow(data as Record<string, unknown>);
}
