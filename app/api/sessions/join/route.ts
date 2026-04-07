import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';

type JoinPayload = {
  sessionId?: string;
  mode?: 'join' | 'request';
};

export async function POST(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as JoinPayload | null;
  if (!body?.sessionId) return jsonError('sessionId is required', 400);

  const { data: session, error: sessionError } = await auth.supabase
    .from('sessions')
    .select('id, session_type, session_role')
    .eq('id', body.sessionId)
    .single();

  if (sessionError || !session) return jsonError('Session not found', 404);

  const isCreatorSession = session.session_role === 'creator';
  const status = isCreatorSession
    ? 'joined'
    : body.mode === 'request' || session.session_type === 'solo'
      ? 'requested'
      : 'joined';

  const { error } = await auth.supabase.from('session_participants').upsert(
    {
      session_id: body.sessionId,
      user_id: auth.user.id,
      status,
    },
    { onConflict: 'session_id,user_id' }
  );

  if (error) return jsonError(error.message, 400);

  return jsonOk({ joined: status === 'joined', status });
}
