'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import AppShell from '@/components/shell/AppShell';
import { ClientShellProviders } from '@/components/shell/ClientShellProviders';
import { supabase } from '@/lib/supabase';
import { hasActiveCreateUpload } from '@/lib/createUploadQueue';

/** Auth-only pages (no app shell). Marketing home `/` is anonymous-OK but uses shell when signed in. */
const STRICT_PUBLIC = new Set(['/login', '/admin/login', '/reset-password', '/verify-account']);

function allowsAnonymousVisit(path: string | null): boolean {
  const p = path || '';
  return p === '/' || STRICT_PUBLIC.has(p);
}

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const isCreateRoute = (pathname || '').startsWith('/create');

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

        if (!allowsAnonymousVisit(pathname || null)) {
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
      setIsVerified(verified);
      setAuthChecked(true);

      if (!verified && pathname !== '/verify-account' && !(pathname || '').startsWith('/admin')) {
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
        if (!allowsAnonymousVisit(pathname || null)) {
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
  }, [pathname, router]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasActiveCreateUpload()) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const showShell =
    isAuthenticated && isVerified && !STRICT_PUBLIC.has(pathname || '') && !isCreateRoute;

  return (
    <>
      <Toaster richColors position="top-center" />
      {!authChecked ? (
        <div className="min-h-screen bg-[var(--bg-primary)]" />
      ) : showShell ? (
        <ClientShellProviders>
          <AppShell>{children}</AppShell>
        </ClientShellProviders>
      ) : (
        children
      )}
    </>
  );
}
