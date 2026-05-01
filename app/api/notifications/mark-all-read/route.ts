import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/server/supabaseServer';
import { markAllNotificationsRead } from '@/lib/ruehl/queries/notifications';

export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  await markAllNotificationsRead(user.id, supabase);
  return NextResponse.json({ ok: true });
}
