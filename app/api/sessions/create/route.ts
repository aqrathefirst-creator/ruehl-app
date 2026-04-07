import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';

type CreateSessionPayload = {
  sessionType?: 'solo' | 'open';
  trainingType?: string | null;
  nutritionType?: string | null;
  timeOption?: 'now' | 'plus30' | 'custom';
  customTime?: string | null;
  note?: string | null;
  hostAsCreator?: boolean;
  lat?: number | null;
  lng?: number | null;
};

const normalizeTime = (payload: CreateSessionPayload) => {
  if (payload.timeOption === 'plus30') return new Date(Date.now() + 30 * 60 * 1000).toISOString();
  if (payload.timeOption === 'custom' && payload.customTime) {
    const date = new Date(payload.customTime);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
};

export async function POST(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as CreateSessionPayload | null;
  if (!body) return jsonError('Invalid body', 400);

  const sessionType = body.sessionType === 'solo' ? 'solo' : 'open';
  const scheduledTime = normalizeTime(body);
  const status = body.timeOption === 'now' || !body.timeOption ? 'active' : 'pending';

  const { data: profile } = await auth.supabase
    .from('profiles')
    .select('is_creator')
    .eq('id', auth.user.id)
    .maybeSingle();

  const canHostCreatorSession = Boolean((profile as { is_creator?: boolean } | null)?.is_creator);
  const sessionRole = canHostCreatorSession && body.hostAsCreator ? 'creator' : 'normal';

  const { data, error } = await auth.supabase
    .from('sessions')
    .insert({
      host_id: auth.user.id,
      session_type: sessionType,
      training_type: body.trainingType || null,
      nutrition_type: body.nutritionType || null,
      session_role: sessionRole,
      status,
      scheduled_time: scheduledTime,
      lat: typeof body.lat === 'number' ? body.lat : null,
      lng: typeof body.lng === 'number' ? body.lng : null,
      note: body.note?.trim() || null,
    })
    .select('id, host_id, session_type, training_type, nutrition_type, session_role, status, scheduled_time, created_at, lat, lng, note')
    .single();

  if (error) return jsonError(error.message, 400);

  await auth.supabase.from('session_participants').upsert(
    {
      session_id: data.id,
      user_id: auth.user.id,
      status: 'joined',
    },
    { onConflict: 'session_id,user_id' }
  );

  return jsonOk({ session: data }, 201);
}
