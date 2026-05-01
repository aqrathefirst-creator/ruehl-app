'use client';

import type { BadgeVerificationStatus } from '@/lib/ruehl/accountTypes';

type Props = {
  /** Direct verified state. When `false`, badge never renders. */
  isVerified?: boolean;
  /** Derives visibility from `badge_verification_status === 'approved'`. */
  status?: BadgeVerificationStatus | string | null;
  /** Legacy `profiles.is_verified` when status column is unset. */
  legacyIsVerified?: boolean | null;
  /** Pixel size (native uses 12 / 14 / 16). Default 16 — ProfileScreen header. */
  size?: number;
  /** Maps to 12 / 14 / 16 when `size` is omitted. */
  sizeKey?: 'sm' | 'md' | 'lg';
  className?: string;
};

const SIZE_MAP = {
  sm: 12,
  md: 14,
  lg: 16,
} as const;

/** Matches native `isUserVerified`: only approved accounts show the badge (no pending clock). */
function shouldShowVerifiedBadge(
  isVerified: boolean | undefined,
  status: BadgeVerificationStatus | string | null | undefined,
  legacyIsVerified: boolean | null | undefined,
): boolean {
  if (isVerified === false) return false;
  if (isVerified === true) return true;

  const s = status as BadgeVerificationStatus | null | undefined;
  if (s === 'approved') return true;
  if (s === 'pending' || s === 'rejected') return false;
  if ((s === null || s === undefined) && legacyIsVerified === true) return true;
  return false;
}

/**
 * Canonical verified badge — brand violet `#a855f7`, matching native `Ionicons` checkmark-circle.
 * Renders nothing unless verified (approved); no pending/rejected glyph.
 */
export default function VerificationBadge({
  isVerified,
  status,
  legacyIsVerified,
  size,
  sizeKey,
  className,
}: Props) {
  if (!shouldShowVerifiedBadge(isVerified, status, legacyIsVerified)) return null;

  const px = size ?? (sizeKey ? SIZE_MAP[sizeKey] : 16);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={px}
      height={px}
      className={['inline-block shrink-0 align-middle', className].filter(Boolean).join(' ')}
      aria-label="Verified"
      role="img"
    >
      <circle cx="12" cy="12" r="11" fill="#a855f7" />
      <path
        d="M7.5 12.5l3 3 6-7"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
