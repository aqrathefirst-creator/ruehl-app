'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const checkCurrentSession = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!active || !user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) return;

      if (profile?.is_admin) {
        router.replace('/admin');
      }
    };

    void checkCurrentSession();

    return () => {
      active = false;
    };
  }, [router]);

  const handleAdminLogin = async () => {
    setError(null);

    if (!email.trim() || !password) {
      setError('Enter admin email and password.');
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      const { data } = await supabase.auth.getUser();
      const signedInUser = data.user;

      if (!signedInUser?.id) {
        throw new Error('Unable to verify session.');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', signedInUser.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profile?.is_admin) {
        await supabase.auth.signOut();
        setError('This account does not have admin access.');
        return;
      }

      router.replace('/admin');
    } catch (loginError: unknown) {
      if (loginError instanceof Error) {
        setError(loginError.message || 'Admin login failed.');
      } else {
        setError('Admin login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex justify-center text-white">
      <div className="w-full max-w-[430px] px-6 py-12 flex flex-col justify-center">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            RUEHL ADMIN
          </h1>
          <p className="text-sm text-gray-500 mt-3">Restricted access control panel</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-4">
          <h2 className="text-xl font-semibold">Admin Login</h2>

          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="Admin email"
            className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm"
          />

          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="Password"
            className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm"
          />

          <button
            onClick={handleAdminLogin}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? 'Please wait...' : 'Login as Admin'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full rounded-xl bg-white/10 border border-white/15 py-2 text-sm"
          >
            Back to User Login
          </button>

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
