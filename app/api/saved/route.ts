import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/server/supabaseServer';
import { getSavedItems } from '@/lib/ruehl/queries/saved';

export async function GET(req: NextRequest) {
  const offset = Number.parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10);
  const limit = Number.parseInt(req.nextUrl.searchParams.get('limit') ?? '30', 10);

  const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
  const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 50 ? limit : 30;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json([]);
  }

  try {
    const items = await getSavedItems(user.id, safeOffset, safeLimit, supabase);
    return NextResponse.json(items);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to load saved items';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
