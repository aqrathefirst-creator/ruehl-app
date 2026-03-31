'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type Profile = {
  id: string;
  username: string;
  bio: string;
  avatar_url: string;
};

type Post = {
  id: string;
  content: string;
  user_id: string;
  media_url?: string | null;
};

type Follow = {
  follower_id: string;
  following_id: string;
};

type AuthUser = {
  id: string;
};

export default function ProfileClient({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const router = useRouter();

  // GET CURRENT USER
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
    });
  }, []);

  // FETCH DATA
  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId);

      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const { data: followsData } = await supabase
        .from('follows')
        .select('*');

      setProfile(profileData?.[0] || null);
      setPosts(postsData || []);
      setFollows(followsData || []);
    };

    fetchData();
  }, [userId]);

  const isFollowing = follows.some(
    (f) =>
      f.follower_id === currentUser?.id &&
      f.following_id === userId
  );

  const followersCount = follows.filter(
    (f) => f.following_id === userId
  ).length;

  const followingCount = follows.filter(
    (f) => f.follower_id === userId
  ).length;

  const handleFollow = async () => {
    if (!currentUser) return;

    const { data } = await supabase
      .from('follows')
      .insert({
        follower_id: currentUser.id,
        following_id: userId,
      })
      .select()
      .single();

    if (data) setFollows((prev) => [...prev, data]);
  };

  const handleUnfollow = async () => {
    if (!currentUser) return;

    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', currentUser.id)
      .eq('following_id', userId);

    setFollows((prev) =>
      prev.filter(
        (f) =>
          !(
            f.follower_id === currentUser.id &&
            f.following_id === userId
          )
      )
    );
  };

  return (
    <div className="max-w-xl mx-auto p-6">

      {/* PROFILE HEADER */}
      <div className="flex items-center gap-4 mb-6">

        <img
          src={profile?.avatar_url || 'https://via.placeholder.com/80'}
          alt={`${profile?.username || 'User'} avatar`}
          className="w-20 h-20 rounded-full object-cover border"
        />

        <div>

          <h1 className="text-2xl font-bold">
            {profile?.username || 'User'}
          </h1>

          <p className="text-gray-500 text-sm">
            {profile?.bio || 'No bio yet'}
          </p>

          {/* STATS */}
          <div className="flex gap-4 mt-2 text-sm">
            <span
              onClick={() => router.push(`/followers/${userId}`)}
              className="cursor-pointer hover:underline"
            >
              {followersCount} followers
            </span>

            <span
              onClick={() => router.push(`/following/${userId}`)}
              className="cursor-pointer hover:underline"
            >
              {followingCount} following
            </span>
          </div>

          {/* ACTIONS */}
          <div className="flex gap-2 mt-3 relative">

            {currentUser?.id === userId && (
              <>
                <button
                  onClick={() => router.push('/edit-profile')}
                  className="border px-3 py-1 rounded text-sm"
                >
                  Edit
                </button>

                {/* CREATE */}
                <div className="relative">
                  <button
                    onClick={() => setShowCreateMenu(!showCreateMenu)}
                    className="px-3 py-1 rounded text-sm bg-white text-black border"
                  >
                    + Create
                  </button>

                  {showCreateMenu && (
                    <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow z-50 text-sm">

                      <button
                        onClick={() => {
                          router.push('/create?type=grid');
                          setShowCreateMenu(false);
                        }}
                        className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                      >
                        Post (Grid)
                      </button>

                      <button
                        onClick={() => {
                          router.push('/create?type=powr');
                          setShowCreateMenu(false);
                        }}
                        className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                      >
                        Status (POWR)
                      </button>

                    </div>
                  )}
                </div>
              </>
            )}

            {currentUser?.id !== userId && (
              <button
                onClick={isFollowing ? handleUnfollow : handleFollow}
                className="border px-3 py-1 rounded text-sm"
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            )}

          </div>

        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-3 gap-1">

        {posts.map((post) => {
          const isVideo =
            post.media_url?.includes('.mp4') ||
            post.media_url?.includes('.mov') ||
            post.media_url?.includes('.webm');

          return (
            <div
              key={post.id}
              className="aspect-square bg-black relative overflow-hidden"
            >

              {post.media_url ? (
                isVideo ? (
                  <video
                    src={post.media_url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                    onLoadedData={(e) => {
                      const video = e.currentTarget;
                      video.currentTime = 0.1;
                    }}
                  />
                ) : (
                  <img
                    src={post.media_url}
                    alt="Profile post media"
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-gray-400">
                  {post.content}
                </div>
              )}

              {isVideo && (
                <div className="absolute bottom-1 right-1 text-white text-xs">
                  ▶
                </div>
              )}

            </div>
          );
        })}

      </div>

    </div>
  );
}