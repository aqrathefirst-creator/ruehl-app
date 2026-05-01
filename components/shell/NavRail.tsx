'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell, Compass, Flame, Home, Plus, Search, User, X } from 'lucide-react';
import CreateModal from '@/components/shell/CreateModal';
import { useUser } from '@/lib/useUser';

export default function NavRail() {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { user, profile } = useUser();
  const [showCreate, setShowCreate] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  const profileHref = profile?.username
    ? `/${String(profile.username).replace(/^@+/, '')}`
    : user?.id
      ? `/profile/${user.id}`
      : '/login';

  const avatarUrl = profile?.avatar_url ?? null;
  const initial = profile?.username?.[0]?.toUpperCase() ?? 'U';

  const pathNorm = (pathname.replace(/\/$/, '') || '/').toLowerCase();
  const hrefNorm = (profileHref.replace(/\/$/, '') || '/').toLowerCase();
  const uid = user?.id;
  const uname = profile?.username?.replace(/^@+/, '').toLowerCase();

  const youActive =
    Boolean(user) &&
    (pathNorm === hrefNorm ||
      Boolean(uid && pathNorm === `/profile/${uid}`.toLowerCase()) ||
      Boolean(uname && pathNorm === `/${uname}`));

  const notificationsActive =
    pathname === '/notifications' || pathname.startsWith('/notifications/');

  const matchHome = pathname === '/';
  const matchNow = pathname === '/now' || pathname.startsWith('/now/');
  const matchExplore = pathname === '/explore' || pathname.startsWith('/explore/');

  const linkRow = (active: boolean) =>
    `flex items-center gap-4 rounded-lg px-4 py-3 text-base transition-colors ${
      active
        ? 'font-semibold text-[#a855f7]'
        : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
    }`;

  return (
    <>
      <div className="flex h-full min-h-0 flex-col bg-[var(--bg-primary)]">
        <div className="px-6 pb-2 pt-6">
          <Link href="/" className="block">
            <h1 className="text-2xl font-bold tracking-tight text-[#a855f7]">RUEHL</h1>
          </Link>
        </div>

        <div className="px-3 pb-1">
          {searchOpen ? (
            <div className="relative">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users, posts, sounds"
                autoFocus
                className="w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] py-2.5 pl-10 pr-9 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-meta)] focus:outline-none focus:ring-1 focus:ring-zinc-600"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchOpen(false);
                    setSearchQuery('');
                  }
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    const q = searchQuery.trim();
                    setSearchOpen(false);
                    setSearchQuery('');
                    router.push(`/explore?q=${encodeURIComponent(q)}`);
                  }
                }}
                aria-label="Search"
              />
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-meta)]" />
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-meta)] hover:text-[var(--text-primary)]"
                aria-label="Close search"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left text-base text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
            >
              <Search size={26} strokeWidth={2} />
              <span>Search</span>
            </button>
          )}
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3" aria-label="Primary">
          <ul className="space-y-1">
            <li>
              <Link href="/" className={linkRow(matchHome)} aria-current={matchHome ? 'page' : undefined}>
                <Home size={26} strokeWidth={matchHome ? 2.4 : 2} fill={matchHome ? 'currentColor' : 'none'} />
                <span>Home</span>
              </Link>
            </li>
            <li>
              <Link href="/now" className={linkRow(matchNow)} aria-current={matchNow ? 'page' : undefined}>
                <Flame size={26} strokeWidth={matchNow ? 2.4 : 2} fill={matchNow ? 'currentColor' : 'none'} />
                <span>Now</span>
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left text-base text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
              >
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#a855f7]">
                  <Plus size={18} className="text-white" strokeWidth={2.5} />
                </span>
                <span>Create</span>
              </button>
            </li>
            <li>
              <Link
                href="/explore"
                className={linkRow(matchExplore)}
                aria-current={matchExplore ? 'page' : undefined}
              >
                <Compass size={26} strokeWidth={matchExplore ? 2.4 : 2} />
                <span>Explore</span>
              </Link>
            </li>
            <li>
              <Link
                href="/notifications"
                className={linkRow(notificationsActive)}
                aria-current={notificationsActive ? 'page' : undefined}
              >
                <Bell size={26} strokeWidth={notificationsActive ? 2.4 : 2} fill={notificationsActive ? 'currentColor' : 'none'} />
                <span>Notifications</span>
              </Link>
            </li>
            <li>
              <Link
                href={profileHref}
                className={linkRow(youActive)}
                aria-current={youActive ? 'page' : undefined}
              >
                {avatarUrl ? (
                  <span
                    className={`relative h-[26px] w-[26px] shrink-0 overflow-hidden rounded-full ${
                      youActive ? 'ring-2 ring-[#a855f7]' : 'ring-1 ring-[var(--border-subtle)]'
                    }`}
                  >
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  </span>
                ) : (
                  <User size={26} strokeWidth={youActive ? 2.4 : 2} />
                )}
                <span>You</span>
              </Link>
            </li>
          </ul>
        </nav>

        <div className="border-t border-[var(--border-subtle)] p-4">
          {user ? (
            <Link
              href="/settings"
              className="block rounded-lg px-4 py-2 text-sm text-[var(--text-meta)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
            >
              Settings
            </Link>
          ) : (
            <Link
              href="/login"
              className="block w-full rounded-full bg-[#a855f7] py-2.5 text-center text-sm font-medium text-white transition hover:brightness-110"
            >
              Log in
            </Link>
          )}
        </div>
      </div>

      <CreateModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
