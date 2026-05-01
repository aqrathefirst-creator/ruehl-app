'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { savePendingVerification, sendVerificationCode } from '@/lib/authVerification';

type SignupMethod = 'email' | 'mobile';

export default function SignupPage() {
  const router = useRouter();

  const [signupMethod, setSignupMethod] = useState<SignupMethod>('email');
  const [username, setUsername] = useState('');
  const [signupIdentifier, setSignupIdentifier] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signupValid =
    username.trim().length > 0 && signupIdentifier.trim().length > 0 && signupPassword.length > 0;

  const resetFeedback = () => setError(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!signupValid || loading) return;

    if (!username.trim() || !signupIdentifier.trim() || !signupPassword) {
      setError('Enter username, account identifier, and password.');
      return;
    }

    setLoading(true);

    try {
      let authError: any = null;
      let createdUser: any = null;

      if (signupMethod === 'email') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: signupIdentifier.trim(),
          password: signupPassword,
          options: {
            data: { username: username.trim() },
          },
        });
        authError = signUpError;
        createdUser = data.user;
      } else {
        const normalized = signupIdentifier.trim().startsWith('+')
          ? signupIdentifier.trim()
          : `+${signupIdentifier.trim()}`;

        const { data, error: signUpError } = await supabase.auth.signUp({
          phone: normalized,
          password: signupPassword,
          options: {
            data: { username: username.trim() },
          },
        });
        authError = signUpError;
        createdUser = data.user;
      }

      if (authError) {
        setError(authError.message || 'Unable to create account.');
        setLoading(false);
        return;
      }

      if (createdUser?.id) {
        await supabase.from('profiles').upsert({
          id: createdUser.id,
          username: username.trim(),
          avatar_url: null,
          is_verified: false,
          verified: false,
        });
      }

      savePendingVerification({
        method: signupMethod === 'email' ? 'email' : 'phone',
        value:
          signupMethod === 'email'
            ? signupIdentifier.trim().toLowerCase()
            : signupIdentifier.trim().startsWith('+')
              ? signupIdentifier.trim()
              : `+${signupIdentifier.trim()}`,
        username: username.trim(),
      });

      await sendVerificationCode({
        method: signupMethod === 'email' ? 'email' : 'phone',
        value:
          signupMethod === 'email'
            ? signupIdentifier.trim().toLowerCase()
            : signupIdentifier.trim().startsWith('+')
              ? signupIdentifier.trim()
              : `+${signupIdentifier.trim()}`,
      });

      router.replace('/verify-account');
    } catch (err: any) {
      setError(err?.message || 'Unable to create account.');
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
          <h1 className="mb-8 text-3xl font-bold">Sign up</h1>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSignupMethod('email')}
                className={`rounded-lg border py-2 text-sm ${
                  signupMethod === 'email'
                    ? 'border-white bg-white text-black'
                    : 'border-zinc-700 bg-zinc-900 text-white'
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setSignupMethod('mobile')}
                className={`rounded-lg border py-2 text-sm ${
                  signupMethod === 'mobile'
                    ? 'border-white bg-white text-black'
                    : 'border-zinc-700 bg-zinc-900 text-white'
                }`}
              >
                Mobile
              </button>
            </div>

            <div>
              <label htmlFor="su-username" className="mb-2 block text-sm text-zinc-400">
                Username
              </label>
              <input
                id="su-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none"
                placeholder="Username"
              />
            </div>

            <div>
              <label htmlFor="su-id" className="mb-2 block text-sm text-zinc-400">
                {signupMethod === 'email' ? 'Email' : 'Mobile number'}
              </label>
              <input
                id="su-id"
                value={signupIdentifier}
                onChange={(e) => setSignupIdentifier(e.target.value)}
                type={signupMethod === 'email' ? 'email' : 'tel'}
                autoComplete={signupMethod === 'email' ? 'email' : 'tel'}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-600 focus:border-zinc-700 focus:outline-none"
                placeholder={signupMethod === 'email' ? 'Email address' : 'Mobile (+country code)'}
              />
            </div>

            <div>
              <label htmlFor="su-password" className="mb-2 block text-sm text-zinc-400">
                Password
              </label>
              <div className="relative">
                <input
                  id="su-password"
                  type={showPassword ? 'text' : 'password'}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  autoComplete="new-password"
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

            {error ? (
              <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-400">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!signupValid || loading}
              className="w-full rounded-lg bg-[#a855f7] py-3 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {loading ? 'Please wait…' : 'Sign up'}
            </button>
          </form>
        </div>
      </main>

      <footer className="px-6 py-6 text-center">
        <p className="text-sm text-zinc-400">
          Already have an account?{' '}
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
