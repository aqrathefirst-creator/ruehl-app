'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';

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
        .select('is_verified')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!mounted) return;

      const verified = error ? true : profileData?.is_verified !== false;
      setIsVerified(verified);
      setAuthChecked(true);

      if (!verified && pathname !== '/verify-account') {
        router.replace('/verify-account');
        return;
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

  const showNav = isAuthenticated && isVerified && !isPublicPage;

  return (
    <html lang="en">
      <body className={`${showNav ? 'pb-24' : ''} bg-black`}>

        {!authChecked ? (
          <div className="min-h-screen bg-black" />
        ) : (
          <>
            {/* ALL PAGES */}
            {children}

            {/* GLOBAL NAV */}
            {showNav && <BottomNav />}
          </>
        )}

      </body>
    </html>
  );
}