'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import VerificationBadge from '@/components/VerificationBadge';

type Category = 'all' | 'strength' | 'core' | 'dance' | 'endurance';

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  verified?: boolean;
};

type Post = {
  id: string;
  user_id: string;
  content: string;
  media_url?: string | null;
  created_at?: string;
};

type Follow = {
  follower_id: string;
  following_id: string;
};

const categoryKeywords: Record<Exclude<Category, 'all'>, string[]> = {
  strength: ['strength', 'lift', 'lifting', 'deadlift', 'squat', 'bench'],
  core: ['core', 'abs', 'plank', 'stability'],
  dance: ['dance', 'choreo', 'choreography', 'freestyle'],
  endurance: ['endurance', 'run', 'cardio', 'cycle', 'stamina'],
};

export default function TrainPage() {
  const router = useRouter();

  const [category, setCategory] = useState<Category>('all');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: profilesData } = await supabase.from('profiles').select('*');
      const { data: postsData } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      const { data: followsData } = await supabase.from('follows').select('*');

      setProfiles((profilesData as Profile[]) || []);
      setPosts((postsData as Post[]) || []);
      setFollows((followsData as Follow[]) || []);
    };

    load();
  }, []);

  const profileById = (id: string) => profiles.find((profile) => profile.id === id);

  const trendingAthletes = useMemo(() => {
    const scored = profiles.map((profile) => {
      const followerCount = follows.filter((follow) => follow.following_id === profile.id).length;
      return { profile, followerCount };
    });

    return scored.sort((a, b) => b.followerCount - a.followerCount).slice(0, 10);
  }, [profiles, follows]);

  const workoutPosts = useMemo(() => {
    const mediaPosts = posts.filter((post) => !!post.media_url || !!post.content?.trim());

    if (category === 'all') return mediaPosts;

    const keywords = categoryKeywords[category];
    return mediaPosts.filter((post) => {
      const text = post.content?.toLowerCase() || '';
      return keywords.some((keyword) => text.includes(keyword));
    });
  }, [posts, category]);

  return (
    <div className="min-h-screen bg-black text-white flex justify-center">
      <div className="w-full max-w-[430px] px-4 pb-28">
        <div className="sticky top-0 z-20 bg-black/90 backdrop-blur border-b border-white/10 -mx-4 px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="text-sm px-3 py-1.5 rounded-full bg-white/10"
            >
              Back
            </button>
            <div className="text-sm font-black tracking-[0.2em] text-gray-300">TRAIN</div>
            <div className="w-14" />
          </div>
        </div>

        <section className="pt-5 space-y-3">
          <h2 className="text-xs font-black tracking-[0.2em] text-gray-400">TRENDING ATHLETES</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {trendingAthletes.map(({ profile, followerCount }) => (
              <button
                key={profile.id}
                onClick={() => router.push(`/profile/${profile.id}`)}
                className="w-36 shrink-0 rounded-xl border border-white/10 bg-[#111111] p-3 text-left"
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/15" />
                )}
                <div className="mt-2 text-sm font-semibold text-white flex items-center gap-1 truncate">
                  @{profile.username}
                  {profile.verified && <VerificationBadge />}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">{followerCount} followers</div>
              </button>
            ))}
          </div>
        </section>

        <section className="pt-4 space-y-3">
          <h2 className="text-xs font-black tracking-[0.2em] text-gray-400">CATEGORIES</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(['all', 'strength', 'core', 'dance', 'endurance'] as Category[]).map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                  category === item
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-gray-200 border border-white/15'
                }`}
              >
                {item === 'all' ? 'All' : item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </section>

        <section className="pt-2 space-y-3">
          <h2 className="text-xs font-black tracking-[0.2em] text-gray-400">WORKOUT POSTS</h2>
          <div className="space-y-3">
            {workoutPosts.slice(0, 20).map((post) => {
              const profile = profileById(post.user_id);
              return (
                <button
                  key={post.id}
                  onClick={() => router.push(`/profile/${post.user_id}`)}
                  className="w-full rounded-2xl border border-white/10 bg-[#111111] p-3 text-left"
                >
                  <div className="text-sm font-semibold text-white mb-2">@{profile?.username || 'user'}</div>
                  {post.media_url ? (
                    <img src={post.media_url} className="w-full h-44 object-cover rounded-xl" />
                  ) : null}
                  {post.content ? (
                    <p className="text-sm text-gray-200 mt-2">{post.content}</p>
                  ) : null}
                </button>
              );
            })}
            {workoutPosts.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#101010] p-4 text-sm text-gray-400">
                No posts found for this training category yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
