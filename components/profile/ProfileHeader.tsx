import Image from 'next/image';
import Link from 'next/link';
import { MoreHorizontal, Settings, Shield, UserCircle } from 'lucide-react';
import type { RuehlProfilePage } from '@/lib/ruehl/queries/profileServer';
import VerifiedBadge from '@/components/profile/VerifiedBadge';
import { profileDisplayName } from '@/lib/ruehl/profileDisplay';

type Props = {
  profile: RuehlProfilePage;
  /** Viewer is the profile owner — enables header corner controls. */
  isOwnProfile?: boolean;
  /** Platform admin — show shield link next to Settings (own profile only). */
  showAdminIcon?: boolean;
};

export default function ProfileHeader({ profile, isOwnProfile = false, showAdminIcon = false }: Props) {
  const name = profileDisplayName(profile);
  const un = String(profile.username || 'user').replace(/^@+/, '');
  const initial = (un[0] || 'U').toUpperCase();
  const identityHref = `/${encodeURIComponent(un)}/identity`;

  return (
    <header className="px-4 pb-2 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3 md:gap-4">
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

          <div className="min-w-0 pt-0.5">
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">{name}</h1>
              <VerifiedBadge
                badgeVerificationStatus={profile.badge_verification_status}
                isVerified={profile.is_verified}
                size={16}
              />
              <Link
                href={identityHref}
                className="text-zinc-400 transition hover:text-white"
                title="View Identity"
                aria-label="View Identity"
              >
                <UserCircle className="h-[18px] w-[18px] md:h-5 md:w-5" strokeWidth={1.75} />
              </Link>
            </div>
            <p className="mt-0.5 text-sm font-medium text-[#a855f7]">@{un}</p>
          </div>
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
