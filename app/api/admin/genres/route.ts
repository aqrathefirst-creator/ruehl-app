import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

export async function GET(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { data, error } = await auth.admin
    .from('admin_genres')
    .select('id, name, priority_weight, is_active, created_at, updated_at')
    .order('priority_weight', { ascending: false });

  if (error) return jsonError(error.message, 400);
  return jsonOk({ items: data || [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    priority_weight?: number;
  } | null;

  const name = body?.name?.trim();
  if (!name) return jsonError('name is required', 400);

  const { data, error } = await auth.admin
    .from('admin_genres')
    .insert({
      name,
      priority_weight: Number.isFinite(body?.priority_weight) ? Number(body?.priority_weight) : 100,
      is_active: true,
    })
    .select('id, name, priority_weight, is_active, created_at, updated_at')
    .single();

  if (error) return jsonError(error.message, 400);
  return jsonOk({ item: data }, 201);
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    name?: string;
    priority_weight?: number;
    is_active?: boolean;
  } | null;

  const id = body?.id?.trim();
  if (!id) return jsonError('id is required', 400);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body?.name === 'string' && body.name.trim()) patch.name = body.name.trim();
  if (body?.priority_weight !== undefined) patch.priority_weight = Number(body.priority_weight);
  if (typeof body?.is_active === 'boolean') patch.is_active = body.is_active;

  const { error } = await auth.admin.from('admin_genres').update(patch).eq('id', id);
  if (error) return jsonError(error.message, 400);

  return jsonOk({ success: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim();
  if (!id) return jsonError('id is required', 400);

  const { error } = await auth.admin.from('admin_genres').delete().eq('id', id);
  if (error) return jsonError(error.message, 400);

  return jsonOk({ success: true });
}
