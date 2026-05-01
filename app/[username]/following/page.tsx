import { notFound } from 'next/navigation';
import FollowList from '@/components/follows/FollowList';
import FollowListHeader from '@/components/follows/FollowListHeader';
import { getFollowingOf } from '@/lib/ruehl/queries/follows';
import { getProfileByUsername } from '@/lib/ruehl/queries/profileServer';
import { createServerSupabase } from '@/lib/server/supabaseServer';

export default async function FollowingPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const raw = String(username || '').trim().replace(/^@+/, '');
  const profile = await getProfileByUsername(raw);
  if (!profile?.id) notFound();

  const supabase = await createServerSupabase();
  const initial = await getFollowingOf(profile.id, 0, 20, supabase);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <FollowListHeader profile={profile} listType="following" />
        <FollowList targetUserId={profile.id} listType="following" initial={initial} />
      </div>
    </div>
  );
}
