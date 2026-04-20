'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Flame, Calendar, Plus, ChartColumn } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { clearCreateUploadState, subscribeToCreateUpload, type CreateUploadSnapshot } from '@/lib/createUploadQueue';
import { clearPrewarmedCameraStream, prewarmCameraStream } from '@/lib/cameraSession';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const isAdminRoute = (pathname || '').startsWith('/admin');

  const [userId, setUserId] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [uploadSnapshot, setUploadSnapshot] = useState<CreateUploadSnapshot>({
    active: false,
    progress: 0,
    status: '',
    error: null,
    itemId: null,
    updatedAt: 0,
  });

  useEffect(() => {
    let resolvedUserId: string | null = null;

    const handleAvatarUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ userId: string; avatarUrl: string }>;
      if (customEvent.detail?.userId === resolvedUserId && customEvent.detail?.avatarUrl) {
        setAvatar(customEvent.detail.avatarUrl);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'ruehl:avatar-url' && event.newValue) {
        setAvatar(event.newValue);
      }
    };

    window.addEventListener('ruehl:avatar-updated', handleAvatarUpdated as EventListener);
    window.addEventListener('storage', handleStorage);

    const loadUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      if (!user) return;

      resolvedUserId = user.id;
      setUserId(user.id);

      const cachedAvatar = localStorage.getItem('ruehl:avatar-url');
      if (cachedAvatar) setAvatar(cachedAvatar);

      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, username')
        .eq('id', user.id)
        .single();

      if (profile) {
        setAvatar(profile.avatar_url);
        setUsername(profile.username);
        if (profile.avatar_url) {
          localStorage.setItem('ruehl:avatar-url', profile.avatar_url);
        }
      }
    };

    loadUser();

    return () => {
      window.removeEventListener('ruehl:avatar-updated', handleAvatarUpdated as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => subscribeToCreateUpload(setUploadSnapshot), []);

  useEffect(() => {
    router.prefetch('/create');
    router.prefetch('/now');
    router.prefetch('/notifications');

    if (typeof window === 'undefined' || !navigator.permissions?.query) return;

    navigator.permissions
      .query({ name: 'camera' as PermissionName })
      .then((status) => {
        if (status.state !== 'granted') return;

        const warm = () => {
          void prewarmCameraStream('user');
        };

        if ('requestIdleCallback' in window) {
          (window as Window & { requestIdleCallback?: (callback: () => void) => number }).requestIdleCallback?.(warm);
          return;
        }

        setTimeout(warm, 120);
      })
      .catch(() => undefined);
  }, [router]);

  useEffect(() => {
    if ((pathname || '').startsWith('/create')) return;
    clearPrewarmedCameraStream();
  }, [pathname]);

  // 🔥 UPDATED TABS (Train removed, Now moved)
  const tabs = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Now', path: '/now', icon: Flame },
    { name: 'Charts', path: '/charts', icon: ChartColumn },
    { name: 'Sessions', path: '/sessions', icon: Calendar },
  ];

  const isProfileActive = pathname?.startsWith('/profile');

  if (isAdminRoute) {
    return null;
  }

  return (
    <>
      {(uploadSnapshot.active || uploadSnapshot.error) && (
        <button
          type="button"
          onClick={() => {
            if (uploadSnapshot.error) clearCreateUploadState();
            else router.push('/now');
          }}
          className="fixed bottom-24 left-1/2 z-50 w-[92%] max-w-[430px] -translate-x-1/2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-left shadow-2xl backdrop-blur-md md:hidden"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {uploadSnapshot.error ? 'Post upload failed' : 'Publishing post'}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {uploadSnapshot.error || uploadSnapshot.status}
              </div>
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {uploadSnapshot.error ? 'Dismiss' : `${Math.round(uploadSnapshot.progress)}%`}
            </div>
          </div>

          {!uploadSnapshot.error && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)]">
              <div
                className="h-full bg-[var(--accent-violet)] transition-all duration-300"
                style={{ width: `${Math.max(6, uploadSnapshot.progress)}%` }}
              />
            </div>
          )}
        </button>
      )}

      <div
        className="fixed bottom-4 left-1/2 z-50 flex h-[72px] w-[92%] max-w-[430px] -translate-x-1/2 items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-6 shadow-2xl backdrop-blur-md md:hidden"
      >

      {/* LEFT SIDE */}
      <div className="flex items-center gap-8">
        {tabs.slice(0, 2).map(tab => {
          const Icon = tab.icon;
          const active = pathname === tab.path;

          return (
            <button
              key={tab.name}
              onClick={() => router.push(tab.path)}
              className="flex flex-col items-center gap-1 relative transition active:scale-90"
            >
              <Icon
                size={24}
                className={active ? 'text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)]'}
                strokeWidth={active ? 2.5 : 1.8}
              />

              <span
                className={`text-[11px] ${
                  active ? 'font-semibold text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)]'
                }`}
              >
                {tab.name}
              </span>

              {active && (
                <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-[var(--accent-violet-bright)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* CENTER POST BUTTON */}
      <button
        onClick={() => router.push('/create')}
        onPointerEnter={() => {
          void prewarmCameraStream('user');
        }}
        onTouchStart={() => {
          void prewarmCameraStream('user');
        }}
        onFocus={() => {
          void prewarmCameraStream('user');
        }}
        className="relative -mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-violet)] shadow-lg transition active:scale-90"
      >
        <Plus size={26} className="text-[var(--text-primary)]" />
      </button>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-8">
        {tabs.slice(2).map(tab => {
          const Icon = tab.icon;
          const active = pathname === tab.path;

          return (
            <button
              key={tab.name}
              onClick={() => router.push(tab.path)}
              className="flex flex-col items-center gap-1 relative transition active:scale-90"
            >
              <Icon
                size={24}
                className={active ? 'text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)]'}
                strokeWidth={active ? 2.5 : 1.8}
              />

              <span
                className={`text-[11px] ${
                  active ? 'font-semibold text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)]'
                }`}
              >
                {tab.name}
              </span>

              {active && (
                <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-[var(--accent-violet-bright)]" />
              )}
            </button>
          );
        })}

        {/* PROFILE */}
        <button
          disabled={!userId}
          onClick={() => userId && router.push(`/profile/${userId}`)}
          className="flex flex-col items-center gap-1 relative transition active:scale-90"
        >
          <div
            className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-[var(--text-primary)] ${
              isProfileActive ? 'ring-2 ring-[var(--accent-violet-bright)]' : ''
            }`}
          >
            {avatar ? (
              <img src={avatar} alt="Profile avatar" className="w-full h-full object-cover" />
            ) : (
              username?.[0]?.toUpperCase() || 'U'
            )}
          </div>

          <span
            className={`text-[11px] ${
              isProfileActive ? 'font-semibold text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)]'
            }`}
          >
            You
          </span>

          {isProfileActive && (
            <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full" />
          )}
        </button>
      </div>

      </div>
    </>
  );
}