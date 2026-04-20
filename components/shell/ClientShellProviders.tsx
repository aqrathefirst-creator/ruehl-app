'use client';

import type { ReactNode } from 'react';
import { ProfileRailUserIdProvider } from './ProfileRailUserIdProvider';

export function ClientShellProviders({ children }: { children: ReactNode }) {
  return <ProfileRailUserIdProvider>{children}</ProfileRailUserIdProvider>;
}
