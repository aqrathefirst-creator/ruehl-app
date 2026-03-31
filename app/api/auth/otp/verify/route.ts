import { createHmac, timingSafeEqual } from 'crypto';
import { createServiceRoleSupabase } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';
import { resolveOtpSecret } from '@/lib/server/otp';

const MAX_ATTEMPTS = 5;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function createOtpHash(email: string, code: string, secret: string) {
  return createHmac('sha256', secret)
    .update(`${email}:${code}`)
    .digest('hex');
}

function secureHashEquals(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      email?: string;
      code?: string;
    } | null;

    const rawEmail = body?.email?.trim();
    const code = body?.code?.trim();

    if (!rawEmail || !code) return jsonError('email and code are required', 400);
    if (!/^\d{6}$/.test(code)) return jsonError('Code must be 6 digits', 400);

    const email = normalizeEmail(rawEmail);
    const secret = resolveOtpSecret();

    const supabase = createServiceRoleSupabase();

    const { data: record, error: loadError } = await supabase
      .from('email_verification_otps')
      .select('otp_hash, attempts, expires_at')
      .eq('email', email)
      .maybeSingle();

    if (loadError) return jsonError(loadError.message || 'Unable to verify code', 500);
    if (!record) return jsonError('Invalid or expired verification code', 400);

    if (record.attempts >= MAX_ATTEMPTS) {
      return jsonError('Too many attempts. Request a new code.', 429);
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      await supabase.from('email_verification_otps').delete().eq('email', email);
      return jsonError('Verification code expired. Request a new code.', 400);
    }

    const expectedHash = createOtpHash(email, code, secret);
    const isMatch = secureHashEquals(expectedHash, record.otp_hash);

    if (!isMatch) {
      const nextAttempts = record.attempts + 1;
      await supabase
        .from('email_verification_otps')
        .update({ attempts: nextAttempts, updated_at: new Date().toISOString() })
        .eq('email', email);

      if (nextAttempts >= MAX_ATTEMPTS) {
        return jsonError('Too many attempts. Request a new code.', 429);
      }

      return jsonError('Invalid verification code', 400);
    }

    const { data: userId, error: verifyError } = await supabase.rpc('mark_profile_verified_by_email', {
      target_email: email,
    });

    if (verifyError) return jsonError(verifyError.message || 'Unable to verify account', 500);

    await supabase.from('email_verification_otps').delete().eq('email', email);

    return jsonOk({ success: true, user_id: userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify code.';
    return jsonError(message, 500);
  }
}