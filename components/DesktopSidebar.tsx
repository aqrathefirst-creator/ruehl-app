'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ChartColumn, Calendar, User, Bell, Search, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  isActive: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  { label: 'Home', href: '/', icon: Home, isActive: (pathname) => pathname === '/' },
  { label: 'Charts', href: '/charts', icon: ChartColumn, isActive: (pathname) => pathname.startsWith('/charts') },
  { label: 'Sessions', href: '/sessions', icon: Calendar, isActive: (pathname) => pathname.startsWith('/sessions') },
  { label: 'Profile', href: '/profile', icon: User, isActive: (pathname) => pathname.startsWith('/profile') },
  { label: 'Notifications', href: '/notifications', icon: Bell, isActive: (pathname) => pathname.startsWith('/notifications') },
  { label: 'Search', href: '/explore', icon: Search, isActive: (pathname) => pathname.startsWith('/explore') },
];

export default function DesktopSidebar() {
  const pathname = usePathname() || '';
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const authUserId = data.user?.id || null;
      setUserId(authUserId);

      if (!authUserId) {
        setUsername(null);
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', authUserId)
        .maybeSingle();

      setUsername((profileData?.username || '').trim().toLowerCase() || null);
    };

    void loadUser();
  }, []);

  const resolveHref = (href: string) => {
    if (href !== '/profile') return href;
    if (username) return `/${username}`;
    return userId ? `/profile/${userId}` : '/profile';
  };

  const profileRoute = resolveHref('/profile');

  const settingsActive = pathname.startsWith('/settings');

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <aside className="hidden md:flex md:sticky md:top-0 md:h-screen md:w-[240px] md:flex-col md:justify-between md:border-r md:border-white/10 md:bg-black/90 md:px-4 md:py-6">
      <div>
        <div className="px-2 pb-6">
          <h1 className="text-xl font-black tracking-tight text-white">RUEHL</h1>
        </div>

        <nav aria-label="Primary" className="space-y-1.5">
          {navItems.map((item) => {
            const active = item.href === '/profile'
              ? (pathname === profileRoute || pathname.startsWith('/profile'))
              : item.isActive(pathname);
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => router.push(resolveHref(item.href))}
                className={[
                  'w-full rounded-xl px-3 py-2.5 text-left transition-colors',
                  'flex items-center gap-3',
                  active ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white',
                ].join(' ')}
              >
                <Icon size={18} className={active ? 'text-white' : 'text-white/70'} strokeWidth={active ? 2.4 : 2} />
                <span className={active ? 'text-sm font-semibold' : 'text-sm'}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-1.5 px-1">
        <button
          type="button"
          onClick={() => router.push('/settings')}
          className={[
            'w-full rounded-xl px-3 py-2.5 text-left transition-colors',
            'flex items-center gap-3',
            settingsActive ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white',
          ].join(' ')}
        >
          <Settings size={18} className={settingsActive ? 'text-white' : 'text-white/70'} strokeWidth={settingsActive ? 2.4 : 2} />
          <span className={settingsActive ? 'text-sm font-semibold' : 'text-sm'}>Settings</span>
        </button>

        <button
          type="button"
          onClick={() => void signOut()}
          className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
