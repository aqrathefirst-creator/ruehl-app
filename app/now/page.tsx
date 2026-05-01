import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/server/supabaseServer';
import NowSurface from '@/components/now/NowSurface';

export default async function NowPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">Now</h1>
        <NowSurface userId={user.id} />
      </div>
    </div>
  );
}
