import Image from 'next/image';
import Link from 'next/link';
import { MoreHorizontal, Settings, Shield, UserCircle } from 'lucide-react';
import type { RuehlProfilePage } from '@/lib/ruehl/queries/profileServer';
import VerificationBadge from '@/components/profile/VerificationBadge';
import { profileDisplayName, profileFullName } from '@/lib/ruehl/profileDisplay';

type Props = {
  profile: RuehlProfilePage;
  /** Viewer is the profile owner — enables header corner controls. */
  isOwnProfile?: boolean;
  /** Platform admin — show shield link next to Settings (own profile only). */
  showAdminIcon?: boolean;
};

export default function ProfileHeader({ profile, isOwnProfile = false, showAdminIcon = false }: Props) {
  const handle = profileDisplayName(profile);
  const fullName = profileFullName(profile);
  const un = String(profile.username || 'user').replace(/^@+/, '');
  const initial = (un[0] || 'U').toUpperCase();
  const identityHref = `/${encodeURIComponent(un)}/identity`;

  return (
    <header className="px-4 pb-2 pt-6">
      <div className="flex items-start gap-3 md:gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-zinc-700/80 bg-zinc-900 md:h-24 md:w-24">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              width={96}
              height={96}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-extrabold text-white md:text-3xl">
              {initial}
            </span>
          )}
        </div>

        {/* Identity column — stacked rows */}
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
          {/* Row 1: bold @username + badge; View Identity here only when no full_name */}
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="inline-flex min-w-0 items-center gap-2 text-xl font-bold tracking-tight text-white md:text-2xl">
              <span className="truncate">@{handle}</span>
              <VerificationBadge
                status={profile.badge_verification_status}
                legacyIsVerified={profile.is_verified}
                size={16}
              />
            </h1>
            {!fullName ? (
              <Link
                href={identityHref}
                className="shrink-0 text-zinc-400 transition hover:text-white"
                title="View Identity"
                aria-label="View Identity"
              >
                <UserCircle className="h-[18px] w-[18px] md:h-5 md:w-5" strokeWidth={1.75} />
              </Link>
            ) : null}
          </div>

          {/* Row 2: full_name + View Identity */}
          {fullName ? (
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-base font-normal text-zinc-400">{fullName}</span>
              <Link
                href={identityHref}
                className="shrink-0 text-zinc-400 transition hover:text-white"
                title="View Identity"
                aria-label="View Identity"
              >
                <UserCircle className="h-[18px] w-[18px] md:h-5 md:w-5" strokeWidth={1.75} />
              </Link>
            </div>
          ) : null}
        </div>

        {isOwnProfile ? (
          <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
            <Link
              href="/settings"
              aria-label="Settings"
              className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
            >
              <Settings size={20} strokeWidth={2} />
            </Link>
            {showAdminIcon ? (
              <Link
                href="/admin"
                aria-label="Admin"
                className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
              >
                <Shield size={20} strokeWidth={2} />
              </Link>
            ) : null}
            <button
              type="button"
              aria-label="More options"
              className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
            >
              <MoreHorizontal size={20} strokeWidth={2} />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
