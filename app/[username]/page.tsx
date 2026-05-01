import { notFound } from 'next/navigation';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileActions from '@/components/profile/ProfileActions';
import ProfileTabs from '@/components/profile/ProfileTabs';
import {
  getCanViewPrivateTabs,
  getProfileByUsername,
  getProfileStatsRow,
  getViewerUserId,
} from '@/lib/ruehl/queries/profileServer';
import { getCurrentSound } from '@/lib/ruehl/queries/profile';
import { createServerSupabase } from '@/lib/server/supabaseServer';

export default async function UsernameProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const supabase = await createServerSupabase();
  const viewerId = await getViewerUserId();
  const [stats, currentSound, canViewTabs] = await Promise.all([
    getProfileStatsRow(profile.id),
    getCurrentSound(profile.id, supabase),
    getCanViewPrivateTabs(profile.id, viewerId),
  ]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl pb-16">
        <ProfileHeader profile={profile} currentSound={currentSound} />
        <ProfileStats stats={stats} username={profile.username} />
        <ProfileActions profile={profile} />
        <ProfileTabs profile={profile} canViewTabs={canViewTabs} />
      </div>
    </div>
  );
}
