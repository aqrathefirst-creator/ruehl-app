import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/server/supabaseServer';
import { getNowFeed } from '@/lib/ruehl/queries/nowFeed';

export async function GET(req: NextRequest) {
  const offset = Math.max(0, Number.parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10) || 0);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10) || 20));

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json([], { status: 200 });
  }

  const items = await getNowFeed(user.id, offset, limit, supabase);
  return NextResponse.json(items);
}
