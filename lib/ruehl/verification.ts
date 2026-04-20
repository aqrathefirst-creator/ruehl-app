/**
 * Ported from `ruehl-native/lib/verification.ts` — source of truth is native. Pure helpers (no I/O).
 *
 * Mirrors `public.verification_submissions` and the `verification-documents` bucket
 * (`20260419000001_verification_system.sql`).
 *
 * ----------------------------------------------------------------------------
 * Web admin / API alignment (WEB_DIRECTION.md §7):
 * - Authoritative verification queue table: **`verification_submissions`** (not `verification_requests`).
 * - Authoritative admin flag: **`public.users.is_admin`** (not `profiles.is_admin`).
 * Phase 2.4 will migrate existing web Route Handlers and admin queries accordingly.
 * ----------------------------------------------------------------------------
 */

import type { AccountType } from './accountTypes';
import { requiresVerification } from './accountTypes';

/** Row review status — matches CHECK on `verification_submissions.status`. */
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

/**
 * UI-facing lifecycle for the Business/Media badge (extends DB status with eligibility tiers).
 * - `ineligible` — Personal tier (no badge verification track in V1).
 * - `fresh` — Eligible tier, no submission yet (`badge_verification_status` null / not applied).
 * - `pending` | `approved` | `rejected` — Same as DB `VerificationStatus`.
 */
export type BadgeVerificationBadgeState =
  | 'ineligible'
  | 'fresh'
  | 'pending'
  | 'approved'
  | 'rejected';

/** Camel-case shape used by native clients when mapping rows (see `VerificationScreen.tsx`). */
export type VerificationSubmission = {
  id: string;
  userId: string;
  accountType: 'business' | 'media'; // Personal can't submit in V1
  accountCategory: string;
  legalEntityName: string;
  websiteUrl: string | null;
  userNotes: string | null;
  documentPath: string;
  status: VerificationStatus;
  rejectionReason: string | null;
  submittedAt: string; // ISO datetime
  reviewedAt: string | null;
  reviewedBy: string | null;
};

/** Input shape for creating a submission (client-side, pre-insert). */
export type VerificationSubmissionInput = {
  accountType: 'business' | 'media';
  accountCategory: string;
  legalEntityName: string;
  websiteUrl?: string;
  userNotes?: string;
  documentPath: string;
};

/** Matches the bucket defined in migration `20260419000001_verification_system.sql`. */
export const VERIFICATION_BUCKET = 'verification-documents';

/** Matches the file_size_limit in the bucket (10 MB). */
export const VERIFICATION_MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** Matches allowed_mime_types in the bucket. */
export const VERIFICATION_ALLOWED_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'application/pdf',
] as const;

/**
 * Brand voice — WEB_DIRECTION.md §8 (“Verified on Ruehl” / badge tooltips).
 * Distinct from short status chip copy in {@link getVerificationStatusLabel}.
 */
export const VERIFIED_ON_RUEHL_BRAND = 'Verified on Ruehl' as const;

/**
 * Copy exported verbatim from `ruehl-native/VerificationScreen.tsx` (native product strings).
 * Also includes status labels aligned with {@link getVerificationStatusLabel}.
 */
export const VERIFICATION_UI_COPY = {
  applyHeading: 'Apply for verification',
  sectionSubmitNewRequest: 'Submit a new request',
  sectionSubmissionDetails: 'Submission details',
  legalEntityLabel: 'Legal entity name *',
  legalEntityPlaceholder: 'Your brand, company, or publication name',
  websiteLabel: 'Website (optional)',
  websitePlaceholder: 'https://example.com',
  notesLabel: 'Notes for reviewer (optional)',
  notesPlaceholder: "Anything you'd like us to know",
  requiredFootnote: 'Required fields marked with *',
  documentSectionLabel: 'Verification document *',
  tapToUploadTitle: 'Tap to upload document',
  tapToUploadSubtitle: 'JPG, PNG, HEIC, or PDF – max 10 MB · images only in V1',
  changeDocument: 'Change',
  submitCta: 'Submit for review',
  submittingCta: 'Submitting…',
} as const;

/**
 * Verbatim body copy from `ruehl-native/VerificationScreen.tsx` (intro paragraph).
 * Pass `getTypeLabel(accountType)` for `accountTypeLabel`.
 */
export function getVerificationApplySubcopy(accountTypeLabel: string): string {
  return `Submit documents to verify your ${accountTypeLabel} account. Once approved, you'll get a blue check on your profile.`;
}

/** Returns true only when the verification status is 'approved'. */
export function isVerified(status: VerificationStatus | null | undefined): boolean {
  return status === 'approved';
}

/** Returns true when there is a pending submission awaiting review. */
export function isVerificationPending(status: VerificationStatus | null | undefined): boolean {
  return status === 'pending';
}

/** Returns true when a prior submission was rejected (user can re-submit). */
export function isVerificationRejected(status: VerificationStatus | null | undefined): boolean {
  return status === 'rejected';
}

/** Returns true when the user can submit a NEW verification request (no pending or approved submission). */
export function canSubmitVerification(status: VerificationStatus | null | undefined): boolean {
  return status !== 'pending' && status !== 'approved';
}

/** Builds "{userId}/{timestamp}-{randomSuffix}.{ext}" for storage; first path segment matches RLS folder rule. */
export function buildVerificationDocumentPath(userId: string, fileExtension: string): string {
  const ext = fileExtension.replace(/^\./u, '').toLowerCase() || 'jpg';
  return `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
}

/** Validates a MIME type against the bucket's allowed list. */
export function isAllowedVerificationMimeType(mime: string): boolean {
  return (VERIFICATION_ALLOWED_MIME_TYPES as readonly string[]).includes(mime.trim());
}

/** Extracts a file extension (without dot) from a URI or path. Returns 'jpg' as safe default. */
export function extractFileExtension(uriOrPath: string): string {
  const withoutFragment = uriOrPath.split('#')[0] ?? '';
  const withoutQuery = withoutFragment.split('?')[0] ?? '';
  const lastDot = withoutQuery.lastIndexOf('.');
  if (lastDot === -1 || lastDot >= withoutQuery.length - 1) return 'jpg';
  const ext = withoutQuery.slice(lastDot + 1).toLowerCase().trim();
  return ext || 'jpg';
}

/** User-facing status label — native `getVerificationStatusLabel` strings. */
export function getVerificationStatusLabel(status: VerificationStatus | null | undefined): string {
  if (status === 'approved') return 'Verified';
  if (status === 'pending') return 'Under review';
  if (status === 'rejected') return 'Not approved';
  return 'Not applied';
}

/** Derives badge UI state from account tier + stored badge verification status on profile/user. */
export function getBadgeVerificationBadgeState(
  accountType: AccountType,
  badgeVerificationStatus: VerificationStatus | null | undefined,
): BadgeVerificationBadgeState {
  if (!requiresVerification(accountType)) return 'ineligible';
  if (badgeVerificationStatus === undefined || badgeVerificationStatus === null) return 'fresh';
  if (badgeVerificationStatus === 'pending') return 'pending';
  if (badgeVerificationStatus === 'approved') return 'approved';
  if (badgeVerificationStatus === 'rejected') return 'rejected';
  return 'fresh';
}

/** Short label for {@link BadgeVerificationBadgeState} (product-facing). */
export function getBadgeVerificationBadgeLabel(state: BadgeVerificationBadgeState): string {
  switch (state) {
    case 'ineligible':
      return 'Verification not required';
    case 'fresh':
      return 'Not applied';
    case 'pending':
      return 'Under review';
    case 'approved':
      return 'Verified';
    case 'rejected':
      return 'Not approved';
    default: {
      const _exhaustive: never = state;
      return String(_exhaustive);
    }
  }
}

/** Returns true when the account tier may submit Business/Media verification (V1 rules). */
export function isVerificationEligibleAccountType(accountType: AccountType): boolean {
  return requiresVerification(accountType);
}

/** Safely parses an unknown value into VerificationStatus or null. */
export function parseVerificationStatus(raw: unknown): VerificationStatus | null {
  if (raw === 'pending' || raw === 'approved' || raw === 'rejected') return raw;
  return null;
}
