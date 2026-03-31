'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import VerificationBadge from '@/components/VerificationBadge';

type Profile = {
  id: string;
  username: string;
  avatar_url?: string | null;
  verified?: boolean;
};

export default function FollowersPage({ params }: { params: Promise<{ id: string }> }) {
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [userId, setUserId] = useState<string>('');

  const router = useRouter();

  // RESOLVE PARAMS
  useEffect(() => {
    const resolveParams = async () => {
      const resolved = await params;
      setUserId(resolved.id);
    };

    resolveParams();
  }, [params]);

  // FETCH DATA ONLY AFTER ID EXISTS
  useEffect(() => {
    if (!userId) return;

    const fetchFollowers = async () => {
      const { data: followsData } = await supabase
        .from('follows')
        .select('*')
        .eq('following_id', userId);

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username');

      const followerProfiles =
        followsData?.map((f) =>
          profilesData?.find((p) => p.id === f.follower_id)
        ) || [];

      setFollowers(followerProfiles.filter(Boolean) as Profile[]);
    };

    fetchFollowers();
  }, [userId]);

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">

      <div className="px-2 py-4">
        <h1 className="text-3xl font-black">Followers</h1>
        <p className="text-sm text-gray-500 mt-1">People following you</p>
      </div>

      {followers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No followers yet</p>
        </div>
      )}

      <div className="space-y-2">
        {followers.map((user) => (
          <button
            key={user.id}
            onClick={() => router.push(`/profile/${user.id}`)}
            className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200 hover:shadow-md transition-shadow"
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={`${user.username} avatar`} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full" />
            )}
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-900 flex items-center gap-1">
                {user.username}
                {user.verified && <VerificationBadge />}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">@{user.username?.toLowerCase()}</p>
            </div>
            <span className="text-sm text-blue-600 font-medium">View</span>
          </button>
        ))}
      </div>

    </div>
  );
}