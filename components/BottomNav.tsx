'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Plus, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { clearCreateUploadState, subscribeToCreateUpload, type CreateUploadSnapshot } from '@/lib/createUploadQueue';
import { prewarmCameraStream } from '@/lib/cameraSession';

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
    void router.prefetch('/settings');

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

  const isProfileActive = pathname?.startsWith('/profile');
  const isHomeActive = pathname === '/';
  const isSettingsActive = pathname?.startsWith('/settings');

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

      <div className="fixed bottom-4 left-1/2 z-50 flex h-[72px] w-[92%] max-w-[430px] -translate-x-1/2 items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-6 shadow-2xl backdrop-blur-md md:hidden">
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="relative flex flex-col items-center gap-1 transition active:scale-90"
          >
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
        </div>

        <button
          type="button"
          onClick={() => {
            toast('Posting is in the Ruehl app. Get it from the App Store.');
            router.replace('/');
          }}
          className="relative -mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-violet)] shadow-lg transition active:scale-90"
        >
          <Plus size={26} className="text-[var(--text-primary)]" />
        </button>

        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => router.push('/settings')}
            className="relative flex flex-col items-center gap-1 transition active:scale-90"
          >
            <Settings
              size={24}
              className={isSettingsActive ? 'text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)]'}
              strokeWidth={isSettingsActive ? 2.5 : 1.8}
            />
            <span
              className={`text-[11px] ${isSettingsActive ? 'font-semibold text-[var(--accent-violet-bright)]' : 'text-[var(--text-muted)]'}`}
            >
              Settings
            </span>
            {isSettingsActive && (
              <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-[var(--accent-violet-bright)]" />
            )}
          </button>

          <button
            type="button"
            disabled={!userId}
            onClick={() => userId && router.push(`/profile/${userId}`)}
            className="relative flex flex-col items-center gap-1 transition active:scale-90"
          >
            <div
              className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-[var(--text-primary)] ${
                isProfileActive ? 'ring-2 ring-[var(--accent-violet-bright)]' : ''
              }`}
            >
              {avatar ? (
                <img src={avatar} alt="Profile avatar" className="h-full w-full object-cover" />
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

            {isProfileActive && <div className="absolute -bottom-1 h-1 w-1 rounded-full bg-[var(--accent-violet-bright)]" />}
          </button>
        </div>
      </div>
    </>
  );
}
