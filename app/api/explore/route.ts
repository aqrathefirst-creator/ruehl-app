import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/server/supabaseServer';
import { getExploreFeed } from '@/lib/ruehl/queries/explore';

export async function GET(req: NextRequest) {
  const offset = Number.parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10);
  const limit = Number.parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10);

  const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
  const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 50 ? limit : 20;

  const supabase = await createServerSupabase();
  const items = await getExploreFeed(safeOffset, safeLimit, supabase);
  return NextResponse.json(items);
}
