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

  const notes = `Add genre requested with priority_weight=${Number.isFinite(body?.priority_weight) ? Number(body?.priority_weight) : 100}`;
  const { error } = await auth.admin.from('admin_requests').insert({
    admin_id: auth.user.id,
    submitted_by: auth.user.id,
    subject: 'ADD_GENRE',
    target_id: name,
    target: name,
    notes,
    status: 'pending',
  });

  if (error) return jsonError(error.message, 400);
  return jsonOk({ success: true, message: 'Request submitted for approval' }, 201);
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

  const nextName = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : id;
  const notes = [
    'Modify genre requested',
    body?.priority_weight !== undefined ? `priority_weight=${Number(body.priority_weight)}` : null,
    typeof body?.is_active === 'boolean' ? `is_active=${body.is_active}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const { error } = await auth.admin.from('admin_requests').insert({
    admin_id: auth.user.id,
    submitted_by: auth.user.id,
    subject: 'MODIFY_GENRE',
    target_id: nextName,
    target: nextName,
    notes,
    status: 'pending',
  });
  if (error) return jsonError(error.message, 400);

  return jsonOk({ success: true, message: 'Request submitted for approval' });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim();
  if (!id) return jsonError('id is required', 400);

  const { error } = await auth.admin.from('admin_requests').insert({
    admin_id: auth.user.id,
    submitted_by: auth.user.id,
    subject: 'REMOVE_GENRE',
    target_id: id,
    target: id,
    notes: 'Remove genre requested',
    status: 'pending',
  });
  if (error) return jsonError(error.message, 400);

  return jsonOk({ success: true, message: 'Request submitted for approval' });
}
