'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  clearPendingVerification,
  getVerificationCooldownSeconds,
  loadPendingVerification,
  savePendingVerification,
  sendVerificationCode,
  type PendingVerification,
  VERIFICATION_RESEND_SECONDS,
} from '@/lib/authVerification';

function maskVerificationTarget(value: string, method: PendingVerification['method']) {
  if (method === 'phone') {
    const tail = value.slice(-2);
    return `${'*'.repeat(Math.max(0, value.length - 2))}${tail}`;
  }

  const [name, domain = ''] = value.split('@');
  const safeName = name.length <= 2 ? `${name[0] || ''}*` : `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
  return `${safeName}@${domain}`;
}

function VerifyAccountPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');
  const fromAdmin = searchParams.get('from') === 'admin';

  const [pending, setPending] = useState<PendingVerification | null>(null);
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(VERIFICATION_RESEND_SECONDS);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const stored = loadPendingVerification();
      if (stored && active) {
        setPending(stored);
        setCooldown(getVerificationCooldownSeconds());
        return;
      }

      const methodParam = searchParams.get('method');
      const valueParam = searchParams.get('value');
      const emailParam = searchParams.get('email');

      if ((methodParam === 'email' || methodParam === 'phone') && valueParam) {
        const nextPending = { method: methodParam, value: valueParam } as PendingVerification;
        savePendingVerification(nextPending);
        if (active) {
          setPending(nextPending);
          setCooldown(getVerificationCooldownSeconds());
        }
        return;
      }

      if (emailParam) {
        const nextPending = { method: 'email', value: emailParam } as PendingVerification;
        savePendingVerification(nextPending);
        if (active) {
          setPending(nextPending);
          setCooldown(getVerificationCooldownSeconds());
        }
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const authUser = session?.user ?? null;

      if (!active || !authUser) return;

      const derived: PendingVerification | null = authUser.email
        ? { method: 'email', value: authUser.email }
        : authUser.phone
          ? { method: 'phone', value: authUser.phone }
          : null;

      if (derived) {
        savePendingVerification(derived);
        setPending(derived);
        setCooldown(getVerificationCooldownSeconds());
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [searchParams]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;

    const timer = window.setTimeout(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const maskedTarget = useMemo(() => {
    if (!pending) return null;
    return maskVerificationTarget(pending.value, pending.method);
  }, [pending]);

  const resetFeedback = () => {
    setMessage(null);
    setError(null);
  };

  const markProfileVerified = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const authUser = session?.user ?? null;

    if (!authUser?.id) return;

    await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        is_verified: true,
        verified: true,
      });
  };

  const handleVerify = async () => {
    resetFeedback();

    if (!pending) {
      setError('Missing verification session. Sign up again or sign in first.');
      return;
    }

    if (code.trim().length !== 6) {
      setError('Enter the 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      if (pending.method === 'email') {
        const response = await fetch('/api/auth/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: pending.value,
            code: code.trim(),
            username: pending.username ?? null,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || 'Unable to verify code.');
        }
      } else {
        const phonePayload = { phone: pending.value, token: code.trim(), type: 'sms' as const };
        const { error: phoneVerifyError } = await supabase.auth.verifyOtp(phonePayload);
        if (phoneVerifyError) {
          throw phoneVerifyError;
        }

        await markProfileVerified();
      }
      clearPendingVerification();
      setMessage('Account verified successfully.');

      if (fromAdmin) {
        router.replace(nextPath && nextPath.startsWith('/') ? nextPath : '/admin/login');
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      router.replace(sessionData.session ? '/' : '/login');
    } catch (verifyError: unknown) {
      if (verifyError instanceof Error) {
        setError(verifyError.message || 'Unable to verify code.');
      } else {
        setError('Unable to verify code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const codeComplete = code.trim().length === 6;
  const canVerify = !!pending && codeComplete && !loading;

  const handleResend = async () => {
    resetFeedback();

    if (!pending || cooldown > 0) return;

    setLoading(true);

    try {
      await sendVerificationCode(pending);
      setCooldown(VERIFICATION_RESEND_SECONDS);
      setMessage('A new verification code has been sent.');
    } catch (resendError: unknown) {
      if (resendError instanceof Error) {
        setError(resendError.message || 'Unable to resend code.');
      } else {
        setError('Unable to resend code.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold text-[#a855f7]">
          RUEHL
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Verify your account</h1>
            <p className="text-sm text-zinc-400">
              {maskedTarget
                ? `We sent a 6-digit code to ${maskedTarget}.`
                : 'We sent a 6-digit code to your signup method.'}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="verify-code" className="mb-2 block text-sm text-zinc-400">
                Verification code
              </label>
              <input
                id="verify-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-center font-mono text-lg tracking-[0.35em] text-white placeholder-zinc-600 placeholder:tracking-normal focus:border-zinc-700 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleVerify}
              disabled={!canVerify}
              className="w-full rounded-lg bg-[#a855f7] py-3 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {loading ? 'Please wait…' : 'Verify'}
            </button>

            <div className="text-center text-sm text-zinc-400">
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || loading || !pending}
                className="font-medium text-[#a855f7] hover:underline disabled:text-zinc-600 disabled:no-underline"
              >
                Resend code
              </button>
              <span className="ml-2">{cooldown > 0 ? `in ${cooldown}s` : 'now'}</span>
            </div>

            {message ? (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-400">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center">
        <p className="text-sm text-zinc-400">
          <Link href="/login" className="font-medium text-[#a855f7] hover:underline">
            Back to log in
          </Link>
        </p>
      </footer>

      <div className="mt-auto flex justify-between px-6 pb-6 text-xs text-zinc-600">
        <span>English</span>
        <span>© {new Date().getFullYear()} Ruehl</span>
      </div>
    </div>
  );
}

export default function VerifyAccountPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" aria-busy="true" aria-live="polite" />}>
      <VerifyAccountPageContent />
    </Suspense>
  );
}