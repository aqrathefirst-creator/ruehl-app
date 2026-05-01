import { createServerSupabase } from '@/lib/server/supabaseServer';
import { getExploreFeed } from '@/lib/ruehl/queries/explore';
import { getSuggestedProfiles } from '@/lib/ruehl/queries/feed';
import ExploreView from '@/components/explore/ExploreView';

export default async function ExplorePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [feed, suggestions] = await Promise.all([
    getExploreFeed(0, 20, supabase),
    getSuggestedProfiles(user?.id ?? null, 6, supabase).catch(() => []),
  ]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">Explore</h1>
        <ExploreView initialFeed={feed} suggestions={suggestions} />
      </div>
    </div>
  );
}
