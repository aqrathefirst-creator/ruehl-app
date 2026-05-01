import { redirect } from 'next/navigation';
import SavedList from '@/components/saved/SavedList';
import { getSavedItems } from '@/lib/ruehl/queries/saved';
import { createServerSupabase } from '@/lib/server/supabaseServer';

/** Avoid caching a signed-in shell for anonymous visitors (auth gate + SavedList stay aligned). */
export const dynamic = 'force-dynamic';

export default async function SavedPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect('/login');
  }

  let initial = await getSavedItems(user.id, 0, 30, supabase).catch(() => []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold">Saved</h1>
        <SavedList initial={initial} />
      </div>
    </div>
  );
}
