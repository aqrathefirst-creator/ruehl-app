'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import { supabase } from '@/lib/supabase';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const isAuthPage = pathname === '/login';

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      const authed = !!session;
      setIsAuthenticated(authed);
      setAuthChecked(true);

      if (!authed && !isAuthPage) router.replace('/login');
      if (authed && isAuthPage) router.replace('/');
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const authed = !!session;
      setIsAuthenticated(authed);

      if (!authed && pathname !== '/login') router.replace('/login');
      if (authed && pathname === '/login') router.replace('/');
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isAuthPage, pathname, router]);

  const showNav = isAuthenticated && !isAuthPage;

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