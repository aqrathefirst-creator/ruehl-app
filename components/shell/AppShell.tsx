'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import BannedGate from '@/components/BannedGate';
import BottomNav from '@/components/BottomNav';
import DeletedGate from '@/components/DeletedGate';
import NavRail from '@/components/shell/NavRail';
import { useProfileRailUserId } from '@/components/shell/ProfileRailUserIdProvider';
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
  const router = useRouter();
  const { profileUserId } = useProfileRailUserId();
  const { user, loading: userLoading, banned, deleted } = useUser();
  const [showAdmin, setShowAdmin] = useState(false);

  const handleAppOnlyCreate = () => {
    toast('Posting is in the Ruehl app. Get it from the App Store.');
    router.replace('/');
  };

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

      /** WEB_DIRECTION §7 — admin UI gate uses `public.users.is_admin` (same source as institutional `requireAdmin`). */
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

  if (userLoading) {
    return <div className="min-h-screen bg-[var(--bg-primary)]" />;
  }

  if (user && banned) {
    return <BannedGate />;
  }

  if (user && deleted) {
    return <DeletedGate />;
  }

  const profileHref = user?.id ? `/profile/${user.id}` : '/profile';

  const mainPadTop = 'md:pt-14 lg:pt-0';
  const mainMarginLeft = 'lg:ml-[var(--shell-nav-collapsed)] min-[1440px]:ml-[var(--shell-nav-expanded)]';
  const mainMarginRight =
    rightRailVariant !== 'none' ? 'xl:mr-[var(--shell-right-rail)]' : '';

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <NavRail profileHref={profileHref} showAdmin={showAdmin} onOpenCreate={handleAppOnlyCreate} />
      <TopBar profileHref={profileHref} showAdmin={showAdmin} onOpenCreate={handleAppOnlyCreate} />
      <RightRail variant={rightRailVariant} profileUserId={profileUserId} />

      <main className={`min-h-screen min-w-0 ${mainMarginLeft} ${mainMarginRight} ${mainPadTop}`}>
        <div className="min-h-screen w-full min-w-0">{children}</div>
      </main>

      <BottomNav />
    </div>
  );
}

export default function AppShell({ children }: Props) {
  return <AppShellInner>{children}</AppShellInner>;
}
