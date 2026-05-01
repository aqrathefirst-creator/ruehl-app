'use client';

import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return tokenValid && password.length >= 8 && confirmPassword.length >= 8 && !saving;
  }, [tokenValid, password, confirmPassword, saving]);

  const resetFeedback = () => {
    setMessage(null);
    setError(null);
  };

  useEffect(() => {
    let mounted = true;

    const activateRecoverySession = async () => {
      setValidating(true);
      setError(null);

      try {
        const url = new URL(window.location.href);
        const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
        const hashParams = new URLSearchParams(hash);

        const type = url.searchParams.get('type') || hashParams.get('type');
        const tokenHash = url.searchParams.get('token_hash');
        const code = url.searchParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (tokenHash && type === 'recovery') {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: tokenHash,
          });
          if (verifyError) throw verifyError;
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (type === 'recovery' && accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('This reset link is invalid or expired. Please request a new password reset email.');
        }

        window.history.replaceState({}, document.title, '/reset-password');

        if (!mounted) return;
        setTokenValid(true);
      } catch (tokenError: unknown) {
        if (!mounted) return;

        setTokenValid(false);
        if (tokenError instanceof Error) {
          setError(tokenError.message || 'Invalid or expired reset link.');
        } else {
          setError('Invalid or expired reset link.');
        }
      } finally {
        if (mounted) setValidating(false);
      }
    };

    void activateRecoverySession();

    return () => {
      mounted = false;
    };
  }, []);

  const handleResetPassword = async () => {
    resetFeedback();

    if (!tokenValid) {
      setError('This reset session is not valid. Request a new reset email.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      await supabase.auth.signOut({ scope: 'global' });

      setMessage('Password updated successfully. Please log in with your new password.');
      setPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        router.replace('/login');
      }, 900);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Unable to reset password.');
      } else {
        setError('Unable to reset password.');
      }
    } finally {
      setSaving(false);
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
            <h1 className="mb-2 text-3xl font-bold">Reset password</h1>
            <p className="text-sm text-zinc-400">Choose a new password for your account.</p>
          </div>

          <div className="space-y-4">
            {validating ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
                Validating reset link…
              </div>
            ) : null}

            {!validating && !tokenValid ? (
              <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                This reset link is invalid or expired.{' '}
                <Link href="/forgot-password" className="font-medium text-[#a855f7] hover:underline">
                  Request a new link
                </Link>
                .
              </div>
            ) : null}

            <div>
              <label htmlFor="rp-password" className="mb-2 block text-sm text-zinc-400">
                New password
              </label>
              <div className="relative">
                <input
                  id="rp-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password"
                  autoComplete="new-password"
                  disabled={!tokenValid || validating}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 pr-11 text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 disabled:pointer-events-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  disabled={!tokenValid || validating}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="rp-confirm" className="mb-2 block text-sm text-zinc-400">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="rp-confirm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  disabled={!tokenValid || validating}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 pr-11 text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 disabled:pointer-events-none"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  disabled={!tokenValid || validating}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetPassword}
              disabled={!canSubmit}
              className="w-full rounded-lg bg-[#a855f7] py-3 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {saving ? 'Updating password…' : 'Update password'}
            </button>

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
