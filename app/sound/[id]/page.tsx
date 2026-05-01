import { notFound } from 'next/navigation';
import SoundDetailView from '@/components/sound/SoundDetailView';
import { getSoundById } from '@/lib/ruehl/queries/sound';
import { createServerSupabase } from '@/lib/server/supabaseServer';

export default async function SoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const data = await getSoundById(id, supabase);

  if (!data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <SoundDetailView initial={data} />
      </div>
    </div>
  );
}
