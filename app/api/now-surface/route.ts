import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/server/supabaseServer';
import { getDropsSubTab, getNowSubTab } from '@/lib/ruehl/queries/nowSurface';

export async function GET(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get('tab') ?? 'now';

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json([]);
  }

  const items =
    tab === 'drops' ? await getDropsSubTab(user.id, supabase) : await getNowSubTab(user.id, supabase);

  return NextResponse.json(items);
}
