import Link from 'next/link';
import { redirect } from 'next/navigation';
import ActivitySection from '@/components/settings/ActivitySection';
import { createServerSupabase } from '@/lib/server/supabaseServer';

export default async function SettingsActivityPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/settings" className="text-sm text-zinc-500 transition hover:text-zinc-300">
          ← Back to settings
        </Link>
        <h1 className="mb-6 mt-2 text-2xl font-bold">Activity</h1>
        <ActivitySection />
      </div>
    </div>
  );
}
