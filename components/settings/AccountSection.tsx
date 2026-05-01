'use client';

import { useCallback, useEffect, useState } from 'react';
import DeleteAccountSection from '@/components/settings/DeleteAccountSection';
import { getErrorMessage, withAuthFetch } from '@/lib/settings/clientFetch';
import type { SettingsRecord } from '@/lib/settings/types';

export default function AccountSection() {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await withAuthFetch('/api/settings');
      const s = res.settings as SettingsRecord;
      setUsername(s.username || '');
      setBio(s.bio || '');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load account'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await withAuthFetch('/api/account', {
        method: 'PATCH',
        body: JSON.stringify({
          username,
          bio,
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(password.trim() ? { password } : {}),
        }),
      });
      setEmail('');
      setPassword('');
      setSuccess('Account settings updated.');
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update account'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-8 text-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
      )}
      {success && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">{success}</div>
      )}

      <section className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-4 space-y-3">
        <h2 className="text-lg font-bold">Account</h2>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm"
        />
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Bio"
          rows={3}
          className="w-full resize-none rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="New email (optional)"
          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (optional)"
          type="password"
          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="h-11 w-full rounded-full bg-[#a855f7] text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500 disabled:opacity-100"
        >
          Save account changes
        </button>
      </section>

      <div className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-4">
        <DeleteAccountSection username={username.trim()} />
      </div>
    </div>
  );
}
