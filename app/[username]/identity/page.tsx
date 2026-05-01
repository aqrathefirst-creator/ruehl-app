import { notFound } from 'next/navigation';
import IdentityView from '@/components/identity/IdentityView';
import {
  getIdentityPagePayload,
  getProfileByUsername,
} from '@/lib/ruehl/queries/profileServer';
import { getCurrentSound } from '@/lib/ruehl/queries/profile';
import { createServerSupabase } from '@/lib/server/supabaseServer';

export default async function IdentityPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const supabase = await createServerSupabase();
  const [currentSound, identity] = await Promise.all([
    getCurrentSound(profile.id, supabase),
    getIdentityPagePayload(profile.id),
  ]);

  return (
    <IdentityView profile={profile} currentSound={currentSound} identity={identity} />
  );
}
