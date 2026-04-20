'use client';

import { Suspense } from 'react';
import ProfileLoadingSkeleton from '@/components/profile/ProfileLoadingSkeleton';
import ProfileView from '@/components/profile/ProfileView';

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileLoadingSkeleton />}>
      <ProfileView />
    </Suspense>
  );
}
