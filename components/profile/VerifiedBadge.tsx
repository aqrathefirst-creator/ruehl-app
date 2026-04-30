import type { BadgeVerificationStatus } from '@/lib/ruehl/accountTypes';

type Props = {
  /** Approved verification badge from `badge_verification_status`. */
  badgeVerificationStatus: BadgeVerificationStatus;
  /** Legacy `profiles.is_verified` when badge column is unset. */
  isVerified: boolean | null | undefined;
  /** Pixel size (native Identity uses ~16). */
  size?: number;
};

function showVerified(badge: BadgeVerificationStatus, legacy: boolean | null | undefined): boolean {
  if (badge === 'approved') return true;
  if (badge === 'pending' || badge === 'rejected') return false;
  return legacy === true;
}

/**
 * Single blue check for approved accounts — uniform across account types (Path D / native spec).
 */
export default function VerifiedBadge({
  badgeVerificationStatus,
  isVerified,
  size = 16,
}: Props) {
  if (!showVerified(badgeVerificationStatus, isVerified)) return null;

  return (
    <svg
      className="inline-block shrink-0 align-middle"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      role="img"
      aria-label="Verified"
    >
      <circle cx="8" cy="8" r="8" fill="#38bdf8" />
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
