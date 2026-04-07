'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './globals.css';
import DesktopSidebar from '@/components/DesktopSidebar';
import DesktopRightPanel from '@/components/DesktopRightPanel';
import { supabase } from '@/lib/supabase';
import { hasActiveCreateUpload } from '@/lib/createUploadQueue';

const PUBLIC_PATHS = new Set(['/login', '/admin/login', '/reset-password', '/verify-account']);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const isPublicPage = PUBLIC_PATHS.has(pathname || '');
  const isCreateRoute = (pathname || '').startsWith('/create');
  const isAdminRoute = (pathname || '').startsWith('/admin');
  const isUsernameOnboardingRoute = (pathname || '').startsWith('/onboarding/username');

  useEffect(() => {
    let mounted = true;

    const syncAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      const authed = !!session;
      setIsAuthenticated(authed);

      if (!authed) {
        setIsVerified(false);
        setAuthChecked(true);

        if (!isPublicPage) {
          if ((pathname || '').startsWith('/admin')) {
            router.replace('/admin/login');
          } else {
            router.replace('/login');
          }
        }
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('is_verified, username')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!mounted) return;

      const verified = error ? true : profileData?.is_verified !== false;
      const username = (profileData?.username || '').trim();
      setIsVerified(verified);
      setAuthChecked(true);

      if (!verified && pathname !== '/verify-account' && !isAdminRoute) {
        router.replace('/verify-account');
        return;
      }

      if (verified && !isAdminRoute) {
        if (!username && !isUsernameOnboardingRoute && pathname !== '/verify-account') {
          router.replace('/onboarding/username');
          return;
        }

        if (username && isUsernameOnboardingRoute) {
          router.replace(`/${username}`);
          return;
        }
      }

      if (verified && pathname === '/verify-account') {
        router.replace('/');
        return;
      }

      if (verified && pathname === '/login') {
        router.replace('/');
      }
    };

    void syncAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const authed = !!session;
      setIsAuthenticated(authed);

      if (!authed) {
        setIsVerified(false);
        if (!PUBLIC_PATHS.has(pathname || '')) {
          if ((pathname || '').startsWith('/admin')) {
            router.replace('/admin/login');
          } else {
            router.replace('/login');
          }
        }
        return;
      }

      void syncAuth();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isPublicPage, pathname, router]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasActiveCreateUpload()) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const showNav = isAuthenticated && isVerified && !isPublicPage && !isCreateRoute && !isAdminRoute && !isUsernameOnboardingRoute;
  const useSystemContainer = pathname !== '/';

  return (
    <html lang="en">
      <body className="bg-black">

        {!authChecked ? (
          <div className="min-h-screen bg-black" />
        ) : showNav ? (
          <div className="lg:grid lg:min-h-screen lg:grid-cols-[240px_minmax(700px,900px)_minmax(320px,380px)] lg:justify-center lg:gap-6">
            <DesktopSidebar />

            <div className={`min-w-0 ${pathname === '/' ? 'lg:col-span-2' : ''} md:px-4 lg:px-0`}>
              {/* ALL PAGES */}
              {useSystemContainer ? (
                <main className="mx-auto w-full max-w-[900px] px-4 sm:px-6 lg:px-8">
                  {children}
                </main>
              ) : (
                children
              )}
            </div>

            {pathname !== '/' && <DesktopRightPanel />}
          </div>
        ) : (
          children
        )}

      </body>
    </html>
  );
}