import { createHash } from 'crypto';

function firstNonEmpty(values: Array<string | undefined | null>) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export function resolveOtpSecret() {
  const explicit = firstNonEmpty([
    process.env.OTP_SIGNING_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ]);

  if (explicit) return explicit;

  const projectScoped = firstNonEmpty([
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]);

  if (projectScoped) {
    return createHash('sha256').update(projectScoped).digest('hex');
  }

  // Final non-empty fallback so OTP signing never hard-fails at runtime.
  return 'ruehl-otp-fallback-secret';
}