import { notFound } from 'next/navigation';
import DropDetailView from '@/components/drop/DropDetailView';
import { getDropById } from '@/lib/ruehl/queries/drop';
import { createServerSupabase } from '@/lib/server/supabaseServer';

export default async function DropPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const data = await getDropById(id, supabase);

  if (!data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <DropDetailView initial={data} />
      </div>
    </div>
  );
}
