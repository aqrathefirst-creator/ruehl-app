'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type Value = {
  profileUserId: string | null;
  setProfileUserId: (id: string | null) => void;
};

const ProfileRailUserIdContext = createContext<Value | null>(null);

export function ProfileRailUserIdProvider({ children }: { children: ReactNode }) {
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const value = useMemo(() => ({ profileUserId, setProfileUserId }), [profileUserId]);

  return <ProfileRailUserIdContext.Provider value={value}>{children}</ProfileRailUserIdContext.Provider>;
}

export function useProfileRailUserId(): Value {
  const ctx = useContext(ProfileRailUserIdContext);
  if (!ctx) {
    throw new Error('useProfileRailUserId must be used within ProfileRailUserIdProvider');
  }
  return ctx;
}
