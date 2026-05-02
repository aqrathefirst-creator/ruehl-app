import { notFound } from 'next/navigation';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileActions from '@/components/profile/ProfileActions';
import ProfileBioBlock from '@/components/profile/ProfileBioBlock';
import ProfileTabs from '@/components/profile/ProfileTabs';
import {
  getCanViewPrivateTabs,
  getProfileByUsername,
  getProfileStatsRow,
  getViewerUserId,
} from '@/lib/ruehl/queries/profileServer';
import { isUserPlatformAdmin } from '@/lib/api/userAdmin';
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
  const [stats, canViewTabs] = await Promise.all([
    getProfileStatsRow(profile.id),
    getCanViewPrivateTabs(profile.id, viewerId),
  ]);

  const isOwnProfile = Boolean(viewerId && viewerId === profile.id);
  const showAdminIcon = Boolean(viewerId && isOwnProfile && (await isUserPlatformAdmin(supabase, viewerId)));

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl pb-16">
        <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} showAdminIcon={showAdminIcon} />
        <ProfileBioBlock profile={profile} />
        <ProfileStats profile={profile} stats={stats} />
        <ProfileActions profile={profile} />
        <ProfileTabs profile={profile} canViewTabs={canViewTabs} />
      </div>
    </div>
  );
}
