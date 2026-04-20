'use client';

import type { BadgeVerificationStatus } from '@/lib/ruehl/accountTypes';
import { Clock, CheckCircle2 } from 'lucide-react';

type Size = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<Size, number> = {
  sm: 14,
  md: 17,
  lg: 22,
};

type Props = {
  status: BadgeVerificationStatus;
  /**
   * Legacy compatibility: when `badge_verification_status` is null but `profiles.is_verified` is still true (prod rows not migrated).
   * Remove this prop after all profiles expose `badge_verification_status`.
   */
  legacyIsVerified?: boolean | null;
  size?: Size;
};

function resolveDisplayStatus(
  status: BadgeVerificationStatus,
  legacyIsVerified?: boolean | null,
): 'approved' | 'pending' | null {
  if (status === 'approved' || status === 'pending') return status;
  if (status === 'rejected') return null;
  if ((status === null || status === undefined) && legacyIsVerified === true) return 'approved';
  return null;
}

/**
 * Data-driven verification badge — prefers `profiles.badge_verification_status`.
 * Approved: blue check (accent-verify). Pending: gray clock. Null/rejected: nothing unless legacy {@link Props.legacyIsVerified} applies.
 */
export default function VerificationBadge({ status, legacyIsVerified, size = 'md' }: Props) {
  const px = SIZE_MAP[size];
  const display = resolveDisplayStatus(status, legacyIsVerified);

  if (display === 'approved') {
    return (
      <CheckCircle2
        className="inline-block shrink-0 align-middle text-[var(--accent-verify)]"
        style={{ width: px, height: px }}
        aria-label="Verified"
        strokeWidth={2.25}
      />
    );
  }

  if (display === 'pending') {
    return (
      <Clock
        className="inline-block shrink-0 align-middle text-[var(--text-muted)]"
        style={{ width: px, height: px }}
        aria-label="Verification pending"
        strokeWidth={2}
      />
    );
  }

  return null;
}
