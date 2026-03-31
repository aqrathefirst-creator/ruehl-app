'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Flame, Calendar, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { clearCreateUploadState, subscribeToCreateUpload, type CreateUploadSnapshot } from '@/lib/createUploadQueue';

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
      const { data } = await supabase.auth.getUser();
      const user = data.user;

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

  // 🔥 UPDATED TABS (Train removed, Now moved)
  const tabs = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Now', path: '/now', icon: Flame },
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
          className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[92%] max-w-[430px] z-50 rounded-2xl border border-white/10 bg-black/85 px-4 py-3 text-left shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">
                {uploadSnapshot.error ? 'Post upload failed' : 'Publishing post'}
              </div>
              <div className="text-xs text-white/70">
                {uploadSnapshot.error || uploadSnapshot.status}
              </div>
            </div>
            <div className="text-xs text-white/80">
              {uploadSnapshot.error ? 'Dismiss' : `${Math.round(uploadSnapshot.progress)}%`}
            </div>
          </div>

          {!uploadSnapshot.error && (
            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 transition-all duration-300"
                style={{ width: `${Math.max(6, uploadSnapshot.progress)}%` }}
              />
            </div>
          )}
        </button>
      )}

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-[430px] backdrop-blur-md bg-black/85 border border-white/[0.08] shadow-2xl rounded-2xl z-50 flex items-center justify-between px-6" style={{ height: 72 }}>

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
                className={active ? 'text-white' : 'text-white/40'}
                strokeWidth={active ? 2.5 : 1.8}
              />

              <span
                className={`text-[11px] ${
                  active ? 'text-white font-semibold' : 'text-white/40'
                }`}
              >
                {tab.name}
              </span>

              {active && (
                <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* CENTER POST BUTTON */}
      <button
        onClick={() => router.push('/create')}
        className="relative -mt-8 w-14 h-14 rounded-full bg-gradient-to-r from-green-400 to-purple-500 flex items-center justify-center shadow-lg active:scale-90 transition"
      >
        <Plus size={26} className="text-black" />
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
                className={active ? 'text-white' : 'text-white/40'}
                strokeWidth={active ? 2.5 : 1.8}
              />

              <span
                className={`text-[11px] ${
                  active ? 'text-white font-semibold' : 'text-white/40'
                }`}
              >
                {tab.name}
              </span>

              {active && (
                <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full" />
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
            className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white ${
              isProfileActive ? 'ring-2 ring-white' : ''
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
              isProfileActive ? 'text-white font-semibold' : 'text-white/40'
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