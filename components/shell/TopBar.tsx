'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Compass, Flame, Home, Plus, User } from 'lucide-react';
import { showCreateInAppPrompt } from '@/components/shell/createInAppPrompt';
import { isProfileStylePath } from '@/lib/shell/navProfile';
import { useUser } from '@/lib/useUser';

export default function TopBar() {
  const pathname = usePathname() || '';
  const { user, profile } = useUser();

  const profileHref = user?.id ? `/profile/${user.id}` : '/profile';
  const avatarUrl = profile?.avatar_url ?? null;
  const initial = profile?.username?.[0]?.toUpperCase() ?? 'U';

  const youActive =
    pathname.replace(/\/$/, '') === profileHref.replace(/\/$/, '') ||
    pathname.startsWith('/profile') ||
    isProfileStylePath(pathname);

  const notificationsActive =
    pathname === '/notifications' || pathname.startsWith('/notifications/');

  const matchHome = pathname === '/';
  const matchNow = pathname === '/now' || pathname.startsWith('/now/');
  const matchExplore = pathname === '/explore' || pathname.startsWith('/explore/');

  const iconBtn = (active: boolean) =>
    `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
      active ? 'text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
    }`;

  return (
    <header className="fixed left-0 right-0 top-0 z-40 hidden h-14 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 md:flex lg:hidden">
      <span className="text-sm font-black tracking-tight text-[var(--text-primary)]">Ruehl</span>
      <nav className="flex flex-1 items-center justify-end gap-0.5 overflow-x-auto pr-1" aria-label="Primary">
        <Link
          href="/"
          className={iconBtn(matchHome)}
          aria-current={matchHome ? 'page' : undefined}
          aria-label="Home"
        >
          <Home size={20} strokeWidth={matchHome ? 2.4 : 2} />
        </Link>
        <Link
          href="/now"
          className={iconBtn(matchNow)}
          aria-current={matchNow ? 'page' : undefined}
          aria-label="Now"
        >
          <Flame size={20} strokeWidth={matchNow ? 2.4 : 2} />
        </Link>

        <button
          type="button"
          onClick={() => showCreateInAppPrompt()}
          className="mx-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#a855f7] shadow-md transition hover:brightness-110 active:scale-[0.98]"
          aria-label="Create"
        >
          <Plus size={22} className="text-white" strokeWidth={2.25} />
        </button>

        <Link
          href="/explore"
          className={iconBtn(matchExplore)}
          aria-current={matchExplore ? 'page' : undefined}
          aria-label="Explore"
        >
          <Compass size={20} strokeWidth={matchExplore ? 2.4 : 2} />
        </Link>

        <Link
          href={profileHref}
          className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl transition-colors ${
            youActive ? 'text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'
          }`}
          aria-current={youActive ? 'page' : undefined}
          aria-label="You"
        >
          {avatarUrl ? (
            <span className="h-7 w-7 overflow-hidden rounded-full ring-1 ring-[var(--border-subtle)]">
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            </span>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-xs font-bold">
              {initial}
            </span>
          )}
        </Link>

        <Link
          href="/notifications"
          className={iconBtn(notificationsActive)}
          aria-current={notificationsActive ? 'page' : undefined}
          aria-label="Notifications"
        >
          <Bell size={20} strokeWidth={notificationsActive ? 2.4 : 2} />
        </Link>
      </nav>
    </header>
  );
}
