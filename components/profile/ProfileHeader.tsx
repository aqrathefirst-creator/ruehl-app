'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
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

function shareProfile(usernameHandle: string) {
  if (typeof window === 'undefined') return;
  const pathUser = String(usernameHandle || '').replace(/^@+/, '');
  const url = `https://ruehl.app/${encodeURIComponent(pathUser)}`;
  if (typeof navigator !== 'undefined' && navigator.share) {
    void navigator.share({ url, title: document.title }).catch(() => {
      void navigator.clipboard.writeText(url).catch(() => undefined);
    });
  } else {
    void navigator.clipboard.writeText(url).catch(() => undefined);
  }
}

export default function ProfileHeader({ profile, isOwnProfile = false, showAdminIcon = false }: Props) {
  const handle = profileDisplayName(profile);
  const fullName = profileFullName(profile);
  const un = String(profile.username || 'user').replace(/^@+/, '');
  const initial = (un[0] || 'U').toUpperCase();
  const identityHref = `/${encodeURIComponent(un)}/identity`;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const onShareProfile = useCallback(() => {
    shareProfile(handle);
    setMenuOpen(false);
  }, [handle]);

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

        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
          {fullName ? (
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight text-white">{fullName}</h1>
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

          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-base font-medium text-zinc-400">@{handle}</span>
            <VerificationBadge
              status={profile.badge_verification_status}
              legacyIsVerified={profile.is_verified}
              size={16}
            />
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
        </div>

        {isOwnProfile ? (
          <div className="relative flex shrink-0 items-center gap-0.5 pt-0.5" ref={menuContainerRef}>
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
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
            >
              <MoreHorizontal size={20} strokeWidth={2} />
            </button>
            {menuOpen ? (
              <div
                className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-xl border border-zinc-700/90 bg-zinc-950 py-1 shadow-xl"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-4 py-2.5 text-left text-sm text-white hover:bg-zinc-900"
                  onClick={onShareProfile}
                >
                  Share profile
                </button>
                {/* TODO: other-user overflow — Block / Unblock, Report, Share profile */}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
