'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Flame, Home, Plus } from 'lucide-react';
import { showCreateInAppPrompt } from '@/components/shell/createInAppPrompt';
import { isProfileStylePath } from '@/lib/shell/navProfile';
import { useUser } from '@/lib/useUser';

type PrimaryLink = {
  key: string;
  href: string;
  label: string;
  icon: typeof Home;
  match: (pathname: string) => boolean;
};

const PRIMARY_LINKS: PrimaryLink[] = [
  { key: 'home', label: 'Home', href: '/', icon: Home, match: (p) => p === '/' },
  {
    key: 'now',
    label: 'Now',
    href: '/now',
    icon: Flame,
    match: (p) => p === '/now' || p.startsWith('/now/'),
  },
  {
    key: 'explore',
    label: 'Explore',
    href: '/explore',
    icon: Compass,
    match: (p) => p === '/explore' || p.startsWith('/explore/'),
  },
];

export default function NavRail() {
  const pathname = usePathname() || '';
  const { user, profile } = useUser();

  const profileHref = user?.id ? `/profile/${user.id}` : '/profile';
  const avatarUrl = profile?.avatar_url ?? null;
  const initial = profile?.username?.[0]?.toUpperCase() ?? 'U';

  const youActive =
    pathname.replace(/\/$/, '') === profileHref.replace(/\/$/, '') || isProfileStylePath(pathname);

  const railClass =
    'fixed left-0 top-0 z-40 hidden h-screen shrink-0 flex-col justify-between border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] py-6 lg:flex w-[var(--shell-nav-collapsed)] min-[1440px]:w-[var(--shell-nav-expanded)] overflow-x-hidden';

  return (
    <nav className={railClass} aria-label="Primary">
      <div className="flex min-h-0 flex-1 flex-col gap-1 px-2 min-[1440px]:px-3">
        {PRIMARY_LINKS.slice(0, 2).map((item) => {
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

        <button
          type="button"
          onClick={() => showCreateInAppPrompt()}
          className="flex items-center justify-center rounded-xl px-2 py-2 min-[1440px]:px-3"
          aria-label="Create"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#a855f7] shadow-md transition hover:brightness-110 active:scale-[0.98]">
            <Plus size={26} className="text-white" strokeWidth={2.25} />
          </span>
        </button>

        {PRIMARY_LINKS.slice(2).map((item) => {
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
          aria-current={youActive ? 'page' : undefined}
        >
          {avatarUrl ? (
            <span className="relative h-[22px] w-[22px] shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--border-subtle)]">
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            </span>
          ) : (
            <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[11px] font-bold leading-none">
              {initial}
            </span>
          )}
          <span className={`hidden min-[1440px]:inline text-sm ${youActive ? 'font-semibold' : ''}`}>You</span>
        </Link>
      </div>

      <div className="px-2 pt-4 min-[1440px]:px-3">
        <p className="hidden text-[length:var(--font-size-meta)] text-[var(--text-meta)] min-[1440px]:block">Ruehl</p>
        <p className="text-center text-[10px] font-black tracking-tight text-[var(--text-meta)] min-[1440px]:hidden">R</p>
      </div>
    </nav>
  );
}
