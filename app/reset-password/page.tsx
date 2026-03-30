'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetFeedback = () => {
    setMessage(null);
    setError(null);
  };

  const handleResetPassword = async () => {
    resetFeedback();

    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });

      if (resetError) {
        throw resetError;
      }

      setMessage('Password reset email sent. Check your inbox.');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Unable to send reset email.');
      } else {
        setError('Unable to send reset email.');
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
          <p className="text-gray-500 mt-3 text-sm">Reset your password</p>
        </div>

        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 backdrop-blur">
          <h2 className="text-xl font-semibold">Forgot Password</h2>

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email address"
            className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm placeholder:text-gray-500"
          />

          <button
            onClick={handleResetPassword}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Please wait...' : 'Reset Password'}
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
