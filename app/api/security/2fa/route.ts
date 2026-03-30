/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireUser } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';

// Supabase MFA bridge (TOTP preferred for scalability).
export async function POST(request: Request) {
  const auth = await requireUser(request.headers.get('authorization'));
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as {
    action?: 'enroll' | 'challenge' | 'verify' | 'unenroll';
    factor_id?: string;
    challenge_id?: string;
    code?: string;
    friendly_name?: string;
  } | null;

  const action = body?.action;
  if (!action) return jsonError('action is required', 400);

  const mfa = (auth.supabase.auth.mfa as any);

  if (action === 'enroll') {
    const { data, error } = await mfa.enroll({
      factorType: 'totp',
      issuer: 'RUEHL',
      friendlyName: body?.friendly_name || 'RUEHL Authenticator',
    });

    if (error) return jsonError(error.message, 400);
    return jsonOk({ factor: data });
  }

  if (action === 'challenge') {
    const factorId = body?.factor_id?.trim();
    if (!factorId) return jsonError('factor_id is required', 400);

    const { data, error } = await mfa.challenge({ factorId });
    if (error) return jsonError(error.message, 400);

    return jsonOk({ challenge: data });
  }

  if (action === 'verify') {
    const factorId = body?.factor_id?.trim();
    const challengeId = body?.challenge_id?.trim();
    const code = body?.code?.trim();

    if (!factorId || !challengeId || !code) {
      return jsonError('factor_id, challenge_id and code are required', 400);
    }

    const { data, error } = await mfa.verify({
      factorId,
      challengeId,
      code,
    });

    if (error) return jsonError(error.message, 400);

    await auth.supabase
      .from('profiles')
      .update({ two_factor_enabled: true })
      .eq('id', auth.user.id);

    return jsonOk({ verified: true, data });
  }

  if (action === 'unenroll') {
    const factorId = body?.factor_id?.trim();
    if (!factorId) return jsonError('factor_id is required', 400);

    const { error } = await mfa.unenroll({ factorId });
    if (error) return jsonError(error.message, 400);

    await auth.supabase
      .from('profiles')
      .update({ two_factor_enabled: false })
      .eq('id', auth.user.id);

    return jsonOk({ success: true });
  }

  return jsonError('Invalid action', 400);
}
