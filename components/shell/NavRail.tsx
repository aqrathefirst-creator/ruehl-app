'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Home, Settings, Shield, UserRound } from 'lucide-react';

export type RailNavItem = {
  key: string;
  href: string;
  label: string;
  icon: typeof Home;
  match: (pathname: string) => boolean;
};

export const RAIL_ITEMS: RailNavItem[] = [
  { key: 'home', label: 'Home', href: '/', icon: Home, match: (p) => p === '/' },
  {
    key: 'explore',
    label: 'Explore',
    href: '/explore',
    icon: Compass,
    match: (p) => p === '/explore' || p.startsWith('/explore/'),
  },
];

type Props = {
  profileHref: string;
  showAdmin: boolean;
};

/** Single-segment paths that are not /@username profiles */
const RESERVED_SEGMENTS = new Set([
  'login',
  'explore',
  'charts',
  'sessions',
  'settings',
  'notifications',
  'create',
  'admin',
  'onboarding',
  'verify-account',
  'reset-password',
  'messages',
  'saved-sounds',
  'sound',
  'followers',
  'following',
  'powr',
  'room',
  'edit-profile',
  'profile',
  'now',
]);

function isProfileStylePath(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '') || '/';
  if (p.startsWith('/profile/')) return true;
  const m = /^\/([^/]+)$/.exec(p);
  if (!m) return false;
  const seg = m[1].toLowerCase();
  return !RESERVED_SEGMENTS.has(seg) && seg.length > 0;
}

export default function NavRail({ profileHref, showAdmin }: Props) {
  const pathname = usePathname() || '';

  const youActive =
    pathname.replace(/\/$/, '') === profileHref.replace(/\/$/, '') || isProfileStylePath(pathname);

  const settingsActive = pathname.startsWith('/settings');

  const railClass =
    'fixed left-0 top-0 z-40 hidden h-screen shrink-0 flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] py-6 lg:flex w-[var(--shell-nav-collapsed)] min-[1440px]:w-[var(--shell-nav-expanded)] overflow-x-hidden';

  return (
    <nav className={railClass} aria-label="Primary">
      <div className="flex min-h-0 flex-1 flex-col gap-1 px-2 min-[1440px]:px-3">
        {RAIL_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors min-[1440px]:px-3 ${
                active
                  ? 'text-[var(--accent-violet-bright)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} className="shrink-0" />
              <span className={`hidden min-[1440px]:inline text-sm ${active ? 'font-semibold' : ''}`}>{item.label}</span>
            </Link>
          );
        })}

        <Link
          href={profileHref}
          className={`flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors min-[1440px]:px-3 ${
            youActive ? 'text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <UserRound size={22} strokeWidth={youActive ? 2.4 : 2} className="shrink-0" />
          <span className={`hidden min-[1440px]:inline text-sm ${youActive ? 'font-semibold' : ''}`}>You</span>
        </Link>

        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors min-[1440px]:px-3 ${
            settingsActive
              ? 'text-[var(--accent-violet-bright)]'
              : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
          }`}
          aria-current={settingsActive ? 'page' : undefined}
        >
          <Settings size={22} strokeWidth={settingsActive ? 2.4 : 2} className="shrink-0" />
          <span className={`hidden min-[1440px]:inline text-sm ${settingsActive ? 'font-semibold' : ''}`}>Settings</span>
        </Link>

        {showAdmin && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors min-[1440px]:px-3 ${
              pathname.startsWith('/admin')
                ? 'text-[var(--accent-violet-bright)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Shield size={22} strokeWidth={pathname.startsWith('/admin') ? 2.4 : 2} className="shrink-0" />
            <span
              className={`hidden min-[1440px]:inline text-sm ${pathname.startsWith('/admin') ? 'font-semibold' : ''}`}
            >
              Admin
            </span>
          </Link>
        )}
      </div>

      <div className="px-2 pt-4 min-[1440px]:px-3">
        <p className="hidden text-[length:var(--font-size-meta)] text-[var(--text-meta)] min-[1440px]:block">Ruehl</p>
        <p className="text-center text-[10px] font-black tracking-tight text-[var(--text-meta)] min-[1440px]:hidden">R</p>
      </div>
    </nav>
  );
}
