'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Flame, Home, Settings, Shield } from 'lucide-react';
import { isProfileStylePath } from '@/components/shell/NavRail';

export type NavItemDef = {
  href: string;
  label: string;
  icon: typeof Home;
  match: (pathname: string) => boolean;
};

export const TOP_BAR_NAV_ITEMS: NavItemDef[] = [
  { label: 'Home', href: '/', icon: Home, match: (pathname) => pathname === '/' },
  {
    label: 'Now',
    href: '/now',
    icon: Flame,
    match: (pathname) => pathname === '/now' || pathname.startsWith('/now/'),
  },
  {
    label: 'Explore',
    href: '/explore',
    icon: Compass,
    match: (pathname) => pathname === '/explore' || pathname.startsWith('/explore/'),
  },
];

type Props = {
  profileHref: string;
  showAdmin: boolean;
};

export default function TopBar({ profileHref, showAdmin }: Props) {
  const pathname = usePathname() || '';
  const settingsActive = pathname.startsWith('/settings');
  const youActive = pathname.startsWith('/profile') || isProfileStylePath(pathname);

  return (
    <header className="fixed left-0 right-0 top-0 z-40 hidden h-14 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 md:flex lg:hidden">
      <span className="text-sm font-black tracking-tight text-[var(--text-primary)]">Ruehl</span>
      <nav className="flex flex-1 items-center justify-end gap-1 overflow-x-auto" aria-label="Primary">
        {TOP_BAR_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                active ? 'text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              }`}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
            </Link>
          );
        })}
        <Link
          href={profileHref}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
            youActive ? 'text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
          }`}
          aria-label="You"
        >
          You
        </Link>
        <Link
          href="/settings"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            settingsActive ? 'text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
          }`}
          aria-label="Settings"
          aria-current={settingsActive ? 'page' : undefined}
        >
          <Settings size={20} strokeWidth={settingsActive ? 2.4 : 2} />
        </Link>
        {showAdmin && (
          <Link
            href="/admin"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              pathname.startsWith('/admin') ? 'text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'
            }`}
            aria-label="Admin"
          >
            <Shield size={20} strokeWidth={pathname.startsWith('/admin') ? 2.4 : 2} />
          </Link>
        )}
      </nav>
    </header>
  );
}
