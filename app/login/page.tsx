'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { savePendingVerification } from '@/lib/authVerification';

const looksLikePhone = (value: string) => /^\+?[0-9]{8,15}$/.test(value.trim());

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [otpCode, setOtpCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [awaitingTwoFactor, setAwaitingTwoFactor] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetFeedback = () => {
    setMessage(null);
    setError(null);
  };

  const signInValid = identifier.trim().length > 0 && password.length > 0;
  const mfaValid = otpCode.trim().length >= 6;

  const redirectAfterAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const signedInUser = session?.user ?? null;

    if (!signedInUser?.id) {
      router.replace('/');
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('two_factor_enabled, is_verified, username')
      .eq('id', signedInUser.id)
      .single();

    if (profileData?.two_factor_enabled) {
      const mfa = supabase.auth.mfa as any;
      const { data: factorData, error: factorsError } = await mfa.listFactors();

      if (factorsError) {
        setError(factorsError.message || 'Unable to start 2FA challenge.');
        return;
      }

      const factorId = factorData?.totp?.[0]?.id || null;

      if (!factorId) {
        setError('2FA is enabled but no authenticator factor was found.');
        return;
      }

      const { data: challengeData, error: challengeError } = await mfa.challenge({
        factorId,
      });

      if (challengeError || !challengeData?.id) {
        setError(challengeError?.message || 'Unable to create 2FA challenge.');
        return;
      }

      setMfaFactorId(factorId);
      setMfaChallengeId(challengeData.id);
      setAwaitingTwoFactor(true);
      setMessage('Enter the OTP from your authenticator app to finish signing in.');
      return;
    }

    if (profileData?.is_verified === false) {
      if (signedInUser.email) {
        savePendingVerification({ method: 'email', value: signedInUser.email });
      } else if (signedInUser.phone) {
        savePendingVerification({ method: 'phone', value: signedInUser.phone });
      }

      router.replace('/verify-account');
      return;
    }

    const username = (profileData?.username || '').trim().toLowerCase();
    if (!username) {
      router.replace('/onboarding/username');
      return;
    }

    setMessage('Signed in successfully.');
    router.replace(`/${username}`);
  };

  const handleSignIn = async (e?: React.FormEvent) => {
    e?.preventDefault();
    resetFeedback();

    if (!identifier.trim() || !password) {
      setError('Enter your username, email, or mobile number, and password.');
      return;
    }

    setLoading(true);

    try {
      const id = identifier.trim();
      let authError: any = null;

      if (id.includes('@')) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: id,
          password,
        });
        authError = signInError;
      } else if (looksLikePhone(id)) {
        const normalized = id.startsWith('+') ? id : `+${id}`;
        const { error: signInError } = await supabase.auth.signInWithPassword({
          phone: normalized,
          password,
        });
        authError = signInError;
      } else {
        const { data: userProfile, error: profileLookupError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', id)
          .single();

        const emailValue =
          (userProfile as any)?.email ||
          (userProfile as any)?.contact_email ||
          null;
        const phoneValue =
          (userProfile as any)?.phone ||
          (userProfile as any)?.mobile ||
          (userProfile as any)?.mobile_number ||
          null;

        if (profileLookupError || (!emailValue && !phoneValue)) {
          setError('Username login is not configured for this account yet. Use email or mobile.');
          setLoading(false);
          return;
        }

        if (emailValue) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: emailValue,
            password,
          });
          authError = signInError;
        } else if (phoneValue) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            phone: phoneValue,
            password,
          });
          authError = signInError;
        }
      }

      if (authError) {
        setError(authError.message || 'Unable to sign in. Please check your credentials.');
        setLoading(false);
        return;
      }

      await redirectAfterAuth();
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTwoFactor = async (e?: React.FormEvent) => {
    e?.preventDefault();
    resetFeedback();

    if (!mfaFactorId || !mfaChallengeId || !otpCode.trim()) {
      setError('Enter your OTP code to continue.');
      return;
    }

    setLoading(true);
    try {
      const mfa = supabase.auth.mfa as any;
      const { error: verifyError } = await mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code: otpCode.trim(),
      });

      if (verifyError) {
        setError(verifyError.message || 'Invalid OTP code.');
        setLoading(false);
        return;
      }

      setAwaitingTwoFactor(false);
      setMfaFactorId(null);
      setMfaChallengeId(null);
      setOtpCode('');
      await redirectAfterAuth();
    } catch (err: any) {
      setError(err?.message || 'Unable to verify OTP.');
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
        <div className="w-full max-w-sm">
          {!awaitingTwoFactor ? (
            <>
              <h1 className="mb-8 text-3xl font-bold">Log in</h1>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label htmlFor="identifier" className="mb-2 block text-sm text-zinc-400">
                    Email, username, or mobile
                  </label>
                  <input
                    id="identifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none"
                    placeholder="Email, username, or mobile"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm text-zinc-400">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 pr-11 text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none"
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <Link href="/forgot-password" className="text-sm text-zinc-400 hover:text-white">
                    Forgot password?
                  </Link>
                </div>

                {message && !awaitingTwoFactor ? (
                  <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300">
                    {message}
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-400">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={!signInValid || loading}
                  className="w-full rounded-lg bg-[#a855f7] py-3 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  {loading ? 'Logging in…' : 'Log in'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="mb-2 text-3xl font-bold">Two-step verification</h1>
              <p className="mb-8 text-sm text-zinc-400">
                Enter the code from your authenticator app to finish logging in.
              </p>

              <form onSubmit={handleVerifyTwoFactor} className="space-y-4">
                <div>
                  <label htmlFor="otp" className="mb-2 block text-sm text-zinc-400">
                    Authenticator code
                  </label>
                  <input
                    id="otp"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-center font-mono text-lg tracking-widest text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none"
                  />
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

                <button
                  type="submit"
                  disabled={!mfaValid || loading}
                  className="w-full rounded-lg bg-[#a855f7] py-3 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  {loading ? 'Please wait…' : 'Continue'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      {!awaitingTwoFactor ? (
        <footer className="px-6 py-6 text-center">
          <p className="text-sm text-zinc-400">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-[#a855f7] hover:underline">
              Sign up
            </Link>
          </p>
        </footer>
      ) : null}

      <div className="mt-auto flex justify-between px-6 pb-6 text-xs text-zinc-600">
        <span>English</span>
        <span>© {new Date().getFullYear()} Ruehl</span>
      </div>
    </div>
  );
}
