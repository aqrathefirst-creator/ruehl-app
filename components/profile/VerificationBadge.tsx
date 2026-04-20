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
  size?: Size;
};

/**
 * Data-driven verification badge — `profiles.badge_verification_status`.
 * Approved: blue check (accent-verify). Pending: gray clock. Null/rejected: nothing.
 */
export default function VerificationBadge({ status, size = 'md' }: Props) {
  const px = SIZE_MAP[size];

  if (status === 'approved') {
    return (
      <CheckCircle2
        className="inline-block shrink-0 align-middle text-[var(--accent-verify)]"
        style={{ width: px, height: px }}
        aria-label="Verified"
        strokeWidth={2.25}
      />
    );
  }

  if (status === 'pending') {
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
