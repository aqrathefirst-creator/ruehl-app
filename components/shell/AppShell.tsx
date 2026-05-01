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
  const { user, loading: userLoading, banned, deleted, platformAdmin: showAdmin } = useUser();

  const rightRailVariant = deriveRightRailVariant(pathname);

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
      <NavRail profileHref={profileHref} showAdmin={showAdmin} />
      <TopBar profileHref={profileHref} showAdmin={showAdmin} />
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
