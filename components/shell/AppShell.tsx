'use client';

import { usePathname } from 'next/navigation';
import BannedGate from '@/components/BannedGate';
import BottomNav from '@/components/BottomNav';
import DeletedGate from '@/components/DeletedGate';
import NavRail from '@/components/shell/NavRail';
import { useProfileRailUserId } from '@/components/shell/ProfileRailUserIdProvider';
import RightRail from '@/components/shell/RightRail';
import { deriveRightRailVariant } from '@/lib/shell/rightRailVariant';
import { useUser } from '@/lib/useUser';

type Props = {
  children: React.ReactNode;
};

function AppShellInner({ children }: Props) {
  const pathname = usePathname() || '';
  const { profileUserId } = useProfileRailUserId();
  const { user, loading: userLoading, banned, deleted } = useUser();

  const rightRailVariant = deriveRightRailVariant(pathname);

  const mainMarginRight =
    rightRailVariant !== 'none' ? 'xl:mr-[var(--shell-right-rail)]' : '';

  const shellChrome = (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 z-40 hidden h-screen w-[var(--shell-nav-expanded)] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-primary)] md:flex">
          <NavRail />
        </aside>

        <main className={`min-h-screen min-w-0 flex-1 ${mainMarginRight}`}>
          <div className="min-h-screen w-full min-w-0">{children}</div>
        </main>
      </div>

      <RightRail variant={rightRailVariant} profileUserId={profileUserId} />

      <BottomNav />
    </div>
  );

  return userLoading ? (
    <div className="min-h-screen bg-[var(--bg-primary)]" />
  ) : user && banned ? (
    <BannedGate />
  ) : user && deleted ? (
    <DeletedGate />
  ) : (
    shellChrome
  );
}

export default function AppShell({ children }: Props) {
  return <AppShellInner>{children}</AppShellInner>;
}
