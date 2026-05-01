import { createServerSupabase } from '@/lib/server/supabaseServer';
import MarketingLanding from '@/components/home/MarketingLanding';
import NowFeed from '@/components/home/NowFeed';

export default async function HomePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return <MarketingLanding />;
  }

  return <NowFeed userId={user.id} />;
}
