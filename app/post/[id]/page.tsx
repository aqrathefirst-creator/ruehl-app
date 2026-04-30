import { notFound } from 'next/navigation';
import PostDetailView from '@/components/post/PostDetailView';
import { getPostById } from '@/lib/ruehl/queries/post';
import { createServerSupabase } from '@/lib/server/supabaseServer';

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const data = await getPostById(id, supabase);

  if (!data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <PostDetailView initial={data} />
      </div>
    </div>
  );
}
