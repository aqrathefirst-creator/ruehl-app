import { supabase } from '@/lib/supabase';

export type PendingVerification = {
  method: 'email' | 'phone';
  value: string;
  username?: string;
};

const STORAGE_KEY = 'ruehl:pending-verification';
const LAST_SENT_KEY = 'ruehl:pending-verification-last-sent';
export const VERIFICATION_RESEND_SECONDS = 60;

export function savePendingVerification(payload: PendingVerification) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function loadPendingVerification(): PendingVerification | null {
  if (typeof window === 'undefined') return null;

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingVerification;
    if (!parsed?.method || !parsed?.value) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingVerification() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(LAST_SENT_KEY);
}

export function markVerificationCodeSent(at = Date.now()) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(LAST_SENT_KEY, String(at));
}

export function getVerificationCooldownSeconds(now = Date.now()) {
  if (typeof window === 'undefined') return 0;

  const raw = window.sessionStorage.getItem(LAST_SENT_KEY);
  if (!raw) return 0;

  const lastSent = Number(raw);
  if (!Number.isFinite(lastSent) || lastSent <= 0) return 0;

  const elapsedSeconds = Math.floor((now - lastSent) / 1000);
  return Math.max(VERIFICATION_RESEND_SECONDS - elapsedSeconds, 0);
}

export async function sendVerificationCode(pending: PendingVerification) {
  if (pending.method === 'email') {
    const response = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pending.value }),
    });

    if (!response.ok) {
      const raw = await response.text();
      let message = `Unable to send verification code (HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}).`;

      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { error?: string };
          message = parsed?.error || raw;
        } catch {
          message = raw;
        }
      }

      throw new Error(message);
    }

    markVerificationCodeSent();
    return;
  }

  if (pending.method === 'phone') {
    const { error } = await supabase.auth.signInWithOtp({
      phone: pending.value,
      options: { shouldCreateUser: false },
    });

    if (error) throw error;
    markVerificationCodeSent();
    return;
  }

  throw new Error('Unsupported verification method.');
}