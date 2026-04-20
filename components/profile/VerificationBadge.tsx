'use client';

import type { BadgeVerificationStatus } from '@/lib/ruehl/accountTypes';
import { Clock } from 'lucide-react';

type Size = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<Size, number> = {
  sm: 13,
  md: 15,
  lg: 18,
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
      <svg
        className="inline-block shrink-0 align-middle"
        style={{ width: px, height: px }}
        viewBox="0 0 16 16"
        role="img"
        aria-label="Verified"
      >
        <circle cx="8" cy="8" r="8" fill="#4FC3F7" />
        <path
          d="M4.8 8.15 6.85 10.2 11.25 5.8"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
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
