'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import NavRail from '@/components/shell/NavRail';
import { ProfileRailUserIdProvider, useProfileRailUserId } from '@/components/shell/ProfileRailUserIdProvider';
import RightRail from '@/components/shell/RightRail';
import TopBar from '@/components/shell/TopBar';
import { supabase } from '@/lib/supabase';
import { deriveRightRailVariant } from '@/lib/shell/rightRailVariant';
import { useUser } from '@/lib/useUser';

type Props = {
  children: React.ReactNode;
};

function AppShellInner({ children }: Props) {
  const pathname = usePathname() || '';
  const { profileUserId } = useProfileRailUserId();
  const { user } = useUser();
  const [showAdmin, setShowAdmin] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const rightRailVariant = deriveRightRailVariant(pathname);

  useEffect(() => {
    let cancelled = false;

    async function loadAdminFlag() {
      if (!user?.id) {
        setShowAdmin(false);
        return;
      }

      const { data, error } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();

      if (cancelled) return;

      /**
       * TODO WEB_DIRECTION §7 — authoritative `is_admin` lives on `public.users` after native migrations.
       * Admin API routes still read `profiles.is_admin` in places; reconcile in Phase 2.4.
       */
      if (error || data == null) {
        setShowAdmin(false);
        return;
      }

      setShowAdmin(Boolean((data as { is_admin?: boolean }).is_admin));
    }

    void loadAdminFlag();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const profileHref = user?.id ? `/profile/${user.id}` : '/profile';

  const mainPadTop = 'md:pt-14 lg:pt-0';
  const mainMarginLeft = 'lg:ml-[var(--shell-nav-collapsed)] min-[1440px]:ml-[var(--shell-nav-expanded)]';
  const mainMarginRight =
    rightRailVariant !== 'none' ? 'xl:mr-[var(--shell-right-rail)]' : '';

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <NavRail profileHref={profileHref} showAdmin={showAdmin} onOpenCreate={() => setCreateOpen(true)} />
      <TopBar profileHref={profileHref} showAdmin={showAdmin} onOpenCreate={() => setCreateOpen(true)} />
      <RightRail variant={rightRailVariant} profileUserId={profileUserId} />

      <main className={`min-h-screen min-w-0 ${mainMarginLeft} ${mainMarginRight} ${mainPadTop}`}>
        <div className="min-h-screen w-full min-w-0">{children}</div>
      </main>

      <BottomNav />

      {createOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-placeholder-title"
        >
          <div className="w-full max-w-sm rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6 shadow-xl">
            <h2 id="create-placeholder-title" className="text-lg font-semibold text-[var(--text-primary)]">
              Create flow coming soon
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Photo, text, and POWR-text creation on web will open here. Voice capture stays on mobile.
            </p>
            <button
              type="button"
              className="mt-6 w-full rounded-xl bg-[var(--accent-violet)] py-2.5 text-sm font-semibold text-white"
              onClick={() => setCreateOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppShell({ children }: Props) {
  return (
    <ProfileRailUserIdProvider>
      <AppShellInner>{children}</AppShellInner>
    </ProfileRailUserIdProvider>
  );
}
