'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

      setMessage('Password updated successfully. Please sign in with your new password.');
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
    <div className="flex justify-center min-h-screen bg-black">
      <div className="w-full max-w-[430px] flex flex-col justify-center px-6 py-10 text-white">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            RUEHL
          </h1>
          <p className="text-gray-500 mt-3 text-sm">Reset your password</p>
        </div>

        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 backdrop-blur">
          <h2 className="text-xl font-semibold">Set New Password</h2>

          {validating && (
            <div className="rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs p-2.5">
              Validating reset link...
            </div>
          )}

          {!validating && !tokenValid && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-2.5">
              Reset link is invalid or expired. Request a new link from admin.
            </div>
          )}

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="New password"
            autoComplete="new-password"
            className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm placeholder:text-gray-500"
          />

          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm placeholder:text-gray-500"
          />

          <button
            onClick={handleResetPassword}
            disabled={!canSubmit}
            className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Updating password...' : 'Update Password'}
          </button>

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
