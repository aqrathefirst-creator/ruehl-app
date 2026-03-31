import { requireAdmin } from '@/lib/server/admin';
import { jsonError, jsonOk } from '@/lib/server/responses';

export async function GET(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { data, error } = await auth.admin
    .from('support_tickets')
    .select('id, user_id, subject, message, status, priority, admin_note, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return jsonError(error.message, 400);
  return jsonOk({ items: data || [] });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    status?: string;
    priority?: string;
    admin_note?: string | null;
  } | null;

  const id = body?.id?.trim();
  if (!id) return jsonError('id is required', 400);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body?.status === 'string') patch.status = body.status;
  if (typeof body?.priority === 'string') patch.priority = body.priority;
  if (body?.admin_note !== undefined) patch.admin_note = body.admin_note;

  const { error } = await auth.admin.from('support_tickets').update(patch).eq('id', id);
  if (error) return jsonError(error.message, 400);

  return jsonOk({ success: true });
}
