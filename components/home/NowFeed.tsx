import { createServerSupabase } from '@/lib/server/supabaseServer';
import { getNowFeed } from '@/lib/ruehl/queries/nowFeed';
import NowFeedClient from '@/components/home/NowFeedClient';

type Props = { userId: string };

export default async function NowFeed({ userId }: Props) {
  const supabase = await createServerSupabase();
  const initial = await getNowFeed(userId, 0, 20, supabase);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <NowFeedClient initial={initial} />
      </div>
    </div>
  );
}
