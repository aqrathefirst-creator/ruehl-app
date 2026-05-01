'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import VerificationBadge from '@/components/profile/VerificationBadge';

type Profile = {
  id: string;
  username: string;
  avatar_url?: string | null;
  badge_verification_status?: string | null;
  is_verified?: boolean | null;
};

export default function FollowersPage({ params }: { params: Promise<{ id: string }> }) {
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [userId, setUserId] = useState<string>('');

  const router = useRouter();

  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setUserId(resolved.id);
    };

    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!userId) return;

    const fetchFollowers = async () => {
      const { data: followsData } = await supabase.from('follows').select('*').eq('following_id', userId);

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, badge_verification_status, is_verified');

      const followerProfiles =
        followsData?.map((f) => profilesData?.find((p) => p.id === f.follower_id)) || [];

      setFollowers(followerProfiles.filter(Boolean) as Profile[]);
    };

    fetchFollowers();
  }, [userId]);

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4">
      <div className="px-2 py-4">
        <h1 className="text-3xl font-black">Followers</h1>
        <p className="mt-1 text-sm text-gray-500">People following you</p>
      </div>

      {followers.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-500">No followers yet</p>
        </div>
      )}

      <div className="space-y-2">
        {followers.map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => router.push(`/profile/${user.id}`)}
            className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={`${user.username} avatar`} className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-300 to-gray-400" />
            )}
            <div className="min-w-0 flex-1 text-left">
              <p className="flex items-center gap-1 font-semibold text-gray-900">
                <span className="truncate">{user.username}</span>
                <VerificationBadge
                  status={user.badge_verification_status}
                  legacyIsVerified={user.is_verified}
                  size={14}
                />
              </p>
              <p className="mt-0.5 text-xs text-gray-500">@{user.username?.toLowerCase()}</p>
            </div>
            <span className="text-sm font-medium text-blue-600">View</span>
          </button>
        ))}
      </div>
    </div>
  );
}
