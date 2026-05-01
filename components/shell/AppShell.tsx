'use client';

import { usePathname } from 'next/navigation';
import BannedGate from '@/components/BannedGate';
import BottomNav from '@/components/BottomNav';
import DeletedGate from '@/components/DeletedGate';
import NavRail from '@/components/shell/NavRail';
import { useProfileRailUserId } from '@/components/shell/ProfileRailUserIdProvider';
import RightRail from '@/components/shell/RightRail';
import TopBar from '@/components/shell/TopBar';
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

  const mainPadTop = 'md:pt-14 lg:pt-0';
  const mainMarginLeft = 'lg:ml-[var(--shell-nav-collapsed)] min-[1440px]:ml-[var(--shell-nav-expanded)]';
  const mainMarginRight =
    rightRailVariant !== 'none' ? 'xl:mr-[var(--shell-right-rail)]' : '';

  const shellChrome = (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <NavRail />
      <TopBar />
      <RightRail variant={rightRailVariant} profileUserId={profileUserId} />

      <main className={`min-h-screen min-w-0 ${mainMarginLeft} ${mainMarginRight} ${mainPadTop}`}>
        <div className="min-h-screen w-full min-w-0">{children}</div>
      </main>

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
