'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Compass, Flame, Home, Plus } from 'lucide-react';
import { showCreateInAppPrompt } from '@/components/shell/createInAppPrompt';
import { isProfileStylePath } from '@/lib/shell/navProfile';
import { useEffect, useState } from 'react';
import { clearCreateUploadState, subscribeToCreateUpload, type CreateUploadSnapshot } from '@/lib/createUploadQueue';
import { prewarmCameraStream } from '@/lib/cameraSession';
import { supabase } from '@/lib/supabase';

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

    void loadUser();

    return () => {
      window.removeEventListener('ruehl:avatar-updated', handleAvatarUpdated as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => subscribeToCreateUpload(setUploadSnapshot), []);

  useEffect(() => {
    void router.prefetch('/');
    void router.prefetch('/now');
    void router.prefetch('/explore');

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
    if (!userId) return;
    void router.prefetch(`/profile/${userId}`);
  }, [router, userId]);

  const isHomeActive = pathname === '/';
  const isNowActive = pathname === '/now' || (pathname || '').startsWith('/now/');
  const isExploreActive = pathname === '/explore' || (pathname || '').startsWith('/explore/');
  const isProfileActive =
    Boolean(pathname?.startsWith('/profile')) || Boolean(pathname && isProfileStylePath(pathname));

  if (isAdminRoute) {
    return null;
  }

  const profileHref = userId ? `/profile/${userId}` : '/profile';

  const navBtn = (active: boolean) =>
    `relative flex min-w-0 flex-col items-center gap-1 transition active:scale-90 ${
      active ? 'text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)]'
    }`;

  return (
    <>
      {(uploadSnapshot.active || uploadSnapshot.error) && (
        <button
          type="button"
          onClick={() => {
            if (uploadSnapshot.error) clearCreateUploadState();
            else router.push('/');
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

      <div className="fixed bottom-4 left-1/2 z-50 w-[92%] max-w-[430px] -translate-x-1/2 md:hidden">
        <div className="relative flex h-[72px] items-end rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 pb-3 pt-2 shadow-2xl backdrop-blur-md">
          <div className="flex min-w-0 flex-1 items-end justify-around gap-1 pr-1">
            <button type="button" onClick={() => router.push('/')} className={navBtn(isHomeActive)}>
              <Home
                size={24}
                className={isHomeActive ? 'text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)]'}
                strokeWidth={isHomeActive ? 2.5 : 1.8}
              />
              <span
                className={`text-[11px] ${isHomeActive ? 'font-semibold text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)]'}`}
              >
                Home
              </span>
              {isHomeActive && (
                <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-[var(--accent-violet-bright)]" />
              )}
            </button>

            <button type="button" onClick={() => router.push('/now')} className={navBtn(isNowActive)}>
              <Flame
                size={24}
                className={isNowActive ? 'text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)]'}
                strokeWidth={isNowActive ? 2.5 : 1.8}
              />
              <span
                className={`text-[11px] ${isNowActive ? 'font-semibold text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)]'}`}
              >
                Now
              </span>
              {isNowActive && (
                <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-[var(--accent-violet-bright)]" />
              )}
            </button>
          </div>

          <div className="w-14 shrink-0" aria-hidden />

          <div className="flex min-w-0 flex-1 items-end justify-around gap-1 pl-1">
            <button type="button" onClick={() => router.push('/explore')} className={navBtn(isExploreActive)}>
              <Compass
                size={24}
                className={isExploreActive ? 'text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)]'}
                strokeWidth={isExploreActive ? 2.5 : 1.8}
              />
              <span
                className={`max-w-[52px] truncate text-[11px] ${isExploreActive ? 'font-semibold text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)]'}`}
              >
                Explore
              </span>
              {isExploreActive && (
                <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-[var(--accent-violet-bright)]" />
              )}
            </button>

            <Link href={profileHref} className={navBtn(isProfileActive)}>
              <div
                className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-[var(--text-primary)] ${
                  isProfileActive ? 'ring-2 ring-[var(--accent-violet-bright)]' : ''
                }`}
              >
                {avatar ? (
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
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
                <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-[var(--accent-violet-bright)]" />
              )}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => showCreateInAppPrompt()}
            className="absolute left-1/2 top-0 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#a855f7] shadow-xl transition hover:brightness-110 active:scale-95"
            aria-label="Create"
          >
            <Plus size={26} className="text-white" strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </>
  );
}
