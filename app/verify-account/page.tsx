'use client';

import { useEffect, useMemo, useState } from 'react';
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

export default function VerifyAccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

      if ((methodParam === 'email' || methodParam === 'phone') && valueParam) {
        const nextPending = { method: methodParam, value: valueParam } as PendingVerification;
        savePendingVerification(nextPending);
        if (active) {
          setPending(nextPending);
          setCooldown(getVerificationCooldownSeconds());
        }
        return;
      }

      const { data } = await supabase.auth.getUser();
      const authUser = data.user;

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
    if (!pending) return;
    if (getVerificationCooldownSeconds() > 0) return;

    let canceled = false;

    const autoSend = async () => {
      try {
        await sendVerificationCode(pending);
        if (!canceled) {
          setCooldown(VERIFICATION_RESEND_SECONDS);
          setMessage('A fresh verification code has been sent.');
        }
      } catch {
        if (!canceled) {
          setError('We could not auto-send a new code. Use resend below.');
        }
      }
    };

    void autoSend();

    return () => {
      canceled = true;
    };
  }, [pending]);

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
    const { data } = await supabase.auth.getUser();
    const authUser = data.user;

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
      const authApi = supabase.auth as any;
      if (pending.method === 'email') {
        const emailPayload = { email: pending.value, token: code.trim(), type: 'email' as const };
        const { error: emailVerifyError } = await authApi.verifyOtp(emailPayload);

        if (emailVerifyError) {
          const signupPayload = { email: pending.value, token: code.trim(), type: 'signup' as const };
          const { error: signupVerifyError } = await authApi.verifyOtp(signupPayload);
          if (signupVerifyError) {
            throw signupVerifyError;
          }
        }
      } else {
        const phonePayload = { phone: pending.value, token: code.trim(), type: 'sms' as const };
        const { error: phoneVerifyError } = await authApi.verifyOtp(phonePayload);
        if (phoneVerifyError) {
          throw phoneVerifyError;
        }
      }

      await markProfileVerified();
      clearPendingVerification();
      setMessage('Account verified successfully.');
      router.replace('/');
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
    <div className="flex justify-center min-h-screen bg-black">
      <div className="w-full max-w-[430px] flex flex-col justify-center px-6 py-10 text-white">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            RUEHL
          </h1>
          <p className="text-gray-500 mt-3 text-sm">Verify your account to enter the app</p>
        </div>

        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 backdrop-blur">
          <h2 className="text-xl font-semibold">Enter Verification Code</h2>

          <p className="text-sm text-gray-400">
            {maskedTarget
              ? `We sent a 6-digit code to ${maskedTarget}.`
              : 'We sent a 6-digit code to your signup method.'}
          </p>

          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            placeholder="000000"
            className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-3 text-center tracking-[0.45em] text-lg placeholder:tracking-normal placeholder:text-gray-500"
          />

          <button
            onClick={handleVerify}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Please wait...' : 'Verify Account'}
          </button>

          <div className="text-center text-sm text-gray-400">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || loading || !pending}
              className="text-purple-400 disabled:text-gray-600"
            >
              Resend code
            </button>
            <span className="ml-2">{cooldown > 0 ? `in ${cooldown}s` : 'now'}</span>
          </div>

          {message && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-xs p-2">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-2">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}