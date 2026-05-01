'use client';

import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getAuthRedirectUrl } from '@/lib/authRedirect';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const valid = isValidEmail(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError(null);

    try {
      const redirectTo = getAuthRedirectUrl('/reset-password') ?? `${window.location.origin}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo,
      });

      if (resetError) {
        setError(resetError.message || 'Unable to send reset email.');
        setLoading(false);
        return;
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
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
          <h1 className="mb-2 text-3xl font-bold">Reset password</h1>
          <p className="mb-8 text-sm text-zinc-400">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>

          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-300">
                Check your email for a reset link. If it doesn&apos;t arrive, check spam or request again from this page.
              </p>
              <Link
                href="/login"
                className="inline-block text-sm font-medium text-[#a855f7] hover:underline"
              >
                Back to log in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="fp-email" className="mb-2 block text-sm text-zinc-400">
                  Email
                </label>
                <input
                  id="fp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>

              {error ? (
                <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-400">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!valid || loading}
                className="w-full rounded-lg bg-[#a855f7] py-3 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="px-6 py-6 text-center">
        <p className="text-sm text-zinc-400">
          Remember your password?{' '}
          <Link href="/login" className="font-medium text-[#a855f7] hover:underline">
            Log in
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
