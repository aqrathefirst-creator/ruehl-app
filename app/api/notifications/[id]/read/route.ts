import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/server/supabaseServer';
import { markNotificationRead } from '@/lib/ruehl/queries/notifications';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const nid = String(id || '').trim();
  if (!nid) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  await markNotificationRead(nid, user.id, supabase);
  return NextResponse.json({ ok: true });
}
