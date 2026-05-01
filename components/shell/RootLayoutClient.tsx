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

function isExplorePath(path: string | null): boolean {
  const p = path || '';
  return p === '/explore' || p.startsWith('/explore/');
}

function allowsAnonymousVisit(path: string | null): boolean {
  const p = path || '';
  return p === '/' || STRICT_PUBLIC.has(p) || isExplorePath(p);
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

  const onExploreAnonymous = !isAuthenticated && isExplorePath(pathname || null);
  const showShell =
    (onExploreAnonymous || (isAuthenticated && isVerified)) &&
    !STRICT_PUBLIC.has(pathname || '') &&
    !isCreateRoute;

  /**
   * Always mount `children` so route trees keep a stable presence across auth resolution.
   * Previously we rendered only a blank div until `authChecked`, which deferred mounting
   * page/client components until after auth — that transition interacted badly with hook
   * counts when shell wrapping toggled. Hidden + overlay preserves hooks order.
   */
  return (
    <>
      <Toaster richColors position="top-center" />
      {!authChecked ? (
        <div
          className="fixed inset-0 z-[100] bg-[var(--bg-primary)]"
          aria-busy="true"
          aria-live="polite"
        />
      ) : null}
      <div
        className={!authChecked ? 'pointer-events-none hidden' : undefined}
        aria-hidden={!authChecked}
      >
        {showShell ? (
          <ClientShellProviders>
            <AppShell>{children}</AppShell>
          </ClientShellProviders>
        ) : (
          children
        )}
      </div>
    </>
  );
}
