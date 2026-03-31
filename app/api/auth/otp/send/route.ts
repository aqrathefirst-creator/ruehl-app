import { createHmac, randomInt } from 'crypto';
import { createServiceRoleSupabase } from '@/lib/server/supabase';
import { jsonError, jsonOk } from '@/lib/server/responses';
import { resolveOtpSecret } from '@/lib/server/otp';

const OTP_EXPIRY_SECONDS = 10 * 60;
const OTP_RESEND_SECONDS = 60;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function createOtpHash(email: string, code: string, secret: string) {
  return createHmac('sha256', secret)
    .update(`${email}:${code}`)
    .digest('hex');
}

async function sendEmailOtp(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OTP_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error('Email OTP provider is not configured.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: 'Your RUEHL verification code',
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your verification code is <strong style="font-size:20px;letter-spacing:2px;">${code}</strong>.</p><p>This code expires in 10 minutes.</p>`,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to send email OTP: ${details}`);
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const rawEmail = body?.email?.trim();

  if (!rawEmail) return jsonError('email is required', 400);

  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) return jsonError('Invalid email address', 400);

  const secret = resolveOtpSecret();

  const supabase = createServiceRoleSupabase();
  const now = Date.now();

  const { data: existing, error: existingError } = await supabase
    .from('email_verification_otps')
    .select('cooldown_until')
    .eq('email', email)
    .maybeSingle();

  if (existingError) {
    return jsonError(existingError.message || 'Unable to process OTP request', 500);
  }

  if (existing?.cooldown_until) {
    const waitMs = new Date(existing.cooldown_until).getTime() - now;
    if (waitMs > 0) {
      const waitSeconds = Math.ceil(waitMs / 1000);
      return jsonError(`Please wait ${waitSeconds}s before requesting a new code.`, 429);
    }
  }

  const code = generateOtpCode();
  const otpHash = createOtpHash(email, code, secret);
  const expiresAt = new Date(now + OTP_EXPIRY_SECONDS * 1000).toISOString();
  const cooldownUntil = new Date(now + OTP_RESEND_SECONDS * 1000).toISOString();

  const { error: saveError } = await supabase
    .from('email_verification_otps')
    .upsert({
      email,
      otp_hash: otpHash,
      attempts: 0,
      expires_at: expiresAt,
      cooldown_until: cooldownUntil,
      updated_at: new Date(now).toISOString(),
    });

  if (saveError) {
    return jsonError(saveError.message || 'Unable to store OTP', 500);
  }

  try {
    await sendEmailOtp(email, code);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send OTP email';
    return jsonError(message, 502);
  }

  return jsonOk({ success: true, cooldown_seconds: OTP_RESEND_SECONDS });
}