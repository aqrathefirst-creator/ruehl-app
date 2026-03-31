'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Category = 'all' | 'meal prep' | 'high protein' | 'vegan';

type Post = {
  id: string;
  user_id: string;
  content: string;
  media_url?: string | null;
};

type Profile = {
  id: string;
  username: string;
};

const categoryKeywords: Record<Exclude<Category, 'all'>, string[]> = {
  'meal prep': ['meal prep', 'prep', 'batch', 'mealplan'],
  'high protein': ['protein', 'high protein', 'macro'],
  vegan: ['vegan', 'plant', 'plant-based'],
};

const healthySpots = [
  { id: '1', name: 'Green Bowl Cafe', distance: '0.8 km', type: 'Meal Prep' },
  { id: '2', name: 'Protein Lab Kitchen', distance: '1.6 km', type: 'High Protein' },
  { id: '3', name: 'Roots & Fuel', distance: '2.3 km', type: 'Vegan' },
];

export default function NutritionPage() {
  const router = useRouter();

  const [category, setCategory] = useState<Category>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [spotView, setSpotView] = useState<'list' | 'map'>('list');

  useEffect(() => {
    const load = async () => {
      const { data: postsData } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      const { data: profilesData } = await supabase.from('profiles').select('id, username');

      setPosts((postsData as Post[]) || []);
      setProfiles((profilesData as Profile[]) || []);
    };

    load();
  }, []);

  const profileById = (id: string) => profiles.find((profile) => profile.id === id);

  const nutritionPosts = useMemo(() => {
    const source = posts.filter((post) => !!post.media_url || !!post.content?.trim());

    if (category === 'all') return source;

    const keywords = categoryKeywords[category];
    return source.filter((post) => {
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
            <div className="text-sm font-black tracking-[0.2em] text-gray-300">NUTRITION</div>
            <div className="w-14" />
          </div>
        </div>

        <section className="pt-5 space-y-3">
          <h2 className="text-xs font-black tracking-[0.2em] text-gray-400">CATEGORIES</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(['all', 'meal prep', 'high protein', 'vegan'] as Category[]).map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                  category === item
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-gray-200 border border-white/15'
                }`}
              >
                {item === 'all' ? 'All' : item}
              </button>
            ))}
          </div>
        </section>

        <section className="pt-3 space-y-3">
          <h2 className="text-xs font-black tracking-[0.2em] text-gray-400">HEALTHY FOOD FEED</h2>
          <div className="space-y-3">
            {nutritionPosts.slice(0, 20).map((post) => (
              <button
                key={post.id}
                onClick={() => router.push(`/profile/${post.user_id}`)}
                className="w-full rounded-2xl border border-white/10 bg-[#111111] p-3 text-left"
              >
                <div className="text-sm font-semibold text-white mb-2">@{profileById(post.user_id)?.username || 'user'}</div>
                {post.media_url ? (
                  <img src={post.media_url} alt="Nutrition post media" className="w-full h-44 object-cover rounded-xl" />
                ) : null}
                {post.content ? (
                  <p className="text-sm text-gray-200 mt-2">{post.content}</p>
                ) : null}
              </button>
            ))}
            {nutritionPosts.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#101010] p-4 text-sm text-gray-400">
                No nutrition posts found for this category.
              </div>
            )}
          </div>
        </section>

        <section className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black tracking-[0.2em] text-gray-400">HEALTHY SPOTS NEAR YOU</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSpotView('list')}
                className={`px-2.5 py-1 rounded-full text-[11px] ${spotView === 'list' ? 'bg-white text-black' : 'bg-white/10 text-gray-300'}`}
              >
                List
              </button>
              <button
                onClick={() => setSpotView('map')}
                className={`px-2.5 py-1 rounded-full text-[11px] ${spotView === 'map' ? 'bg-white text-black' : 'bg-white/10 text-gray-300'}`}
              >
                Map
              </button>
            </div>
          </div>

          {spotView === 'list' ? (
            <div className="space-y-2">
              {healthySpots.map((spot) => (
                <div key={spot.id} className="rounded-xl border border-white/10 bg-[#111111] p-3">
                  <div className="text-sm font-semibold text-white">{spot.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{spot.type} • {spot.distance}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#101010] h-44 p-4 flex items-center justify-center text-sm text-gray-400 text-center">
              Map view placeholder for future location API integration.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
