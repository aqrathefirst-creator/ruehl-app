'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type AvailabilityState = 'idle' | 'checking' | 'available' | 'taken' | 'error';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

function normalizeUsername(input: string) {
  return input
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}

function getValidationError(username: string) {
  if (!username) return 'Username is required.';
  if (username.length < 3) return 'Username must be at least 3 characters.';
  if (username.length > 20) return 'Username must be at most 20 characters.';
  if (!USERNAME_PATTERN.test(username)) return 'Use lowercase letters, numbers, and underscore only.';
  return null;
}

export default function UsernameOnboardingPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [availability, setAvailability] = useState<AvailabilityState>('idle');
  const [checkingValue, setCheckingValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validationError = useMemo(() => getValidationError(username), [username]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      if (!active) return;

      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) return;

      const existingUsername = (profile?.username || '').trim().toLowerCase();
      if (existingUsername) {
        router.replace(`/${existingUsername}`);
        return;
      }

      setLoading(false);
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    setError(null);

    if (!username) {
      setAvailability('idle');
      setCheckingValue('');
      return;
    }

    if (validationError) {
      setAvailability('idle');
      setCheckingValue('');
      return;
    }

    let active = true;
    setAvailability('checking');
    setCheckingValue(username);

    const timer = window.setTimeout(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;
      if (!session?.access_token) {
        setAvailability('error');
        setError('Unable to check availability. Please sign in again.');
        return;
      }

      const response = await fetch(`/api/username/availability?username=${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = (await response.json().catch(() => null)) as
        | { available?: boolean; error?: string }
        | null;

      if (!active) return;

      if (!response.ok) {
        setAvailability('error');
        setError(payload?.error || 'Unable to check username right now.');
        return;
      }

      setAvailability(payload?.available ? 'available' : 'taken');
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [username, validationError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const candidate = normalizeUsername(username);
    const candidateValidationError = getValidationError(candidate);

    if (candidateValidationError) {
      setError(candidateValidationError);
      return;
    }

    if (availability === 'taken') {
      setError('Username is taken.');
      return;
    }

    setSaving(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (!user) {
      setSaving(false);
      setError('You are not signed in.');
      router.replace('/login');
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: candidate })
      .eq('id', user.id);

    if (updateError) {
      setSaving(false);
      if (String((updateError as { code?: string }).code || '') === '23505') {
        setAvailability('taken');
        setError('Username is taken.');
        return;
      }

      setError(updateError.message || 'Unable to save username.');
      return;
    }

    router.replace(`/${candidate}`);
  };

  if (loading) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-md px-6 py-20">
        <h1 className="text-3xl font-black">Choose your username</h1>
        <p className="mt-2 text-sm text-gray-400">You need a username to continue in Ruehl.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="username" className="mb-2 block text-xs uppercase tracking-[0.16em] text-gray-500">
              Username
            </label>
            <input
              id="username"
              value={username}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setUsername(normalizeUsername(event.target.value))}
              placeholder="lowercase_only"
              className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-white/40"
            />
          </div>

          <div className="text-xs">
            {validationError ? (
              <p className="text-red-300">{validationError}</p>
            ) : availability === 'checking' && checkingValue === username ? (
              <p className="text-gray-400">Checking availability...</p>
            ) : availability === 'available' ? (
              <p className="text-green-300">Username available</p>
            ) : availability === 'taken' ? (
              <p className="text-red-300">Username taken</p>
            ) : (
              <p className="text-gray-500">3-20 chars, lowercase letters, numbers, underscore.</p>
            )}
          </div>

          {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={saving || !!validationError || availability === 'checking' || availability === 'taken'}
            className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
