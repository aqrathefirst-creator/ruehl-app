'use client';

import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage, withAuthFetch } from '@/lib/settings/clientFetch';
import type { BlockedUserItem, SettingsRecord } from '@/lib/settings/types';

export default function SecuritySection() {
  const [settings, setSettings] = useState<SettingsRecord | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserItem[]>([]);
  const [blockUserId, setBlockUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, blockedRes] = await Promise.all([
        withAuthFetch('/api/settings'),
        withAuthFetch('/api/blocks'),
      ]);
      setSettings(settingsRes.settings as SettingsRecord);
      setBlockedUsers((blockedRes.items || []) as BlockedUserItem[]);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load security settings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchSettings = async (partial: Partial<SettingsRecord>) => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const next = {
        is_private: settings.is_private,
        allow_messages_from: settings.allow_messages_from,
        show_activity_status: settings.show_activity_status,
        allow_tagging: settings.allow_tagging,
        two_factor_enabled: settings.two_factor_enabled,
        ...partial,
      };
      const res = await withAuthFetch('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(next),
      });
      setSettings(res.settings as SettingsRecord);
      setSuccess('Settings updated.');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update settings'));
    } finally {
      setSaving(false);
    }
  };

  const blockUser = async () => {
    if (!blockUserId.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await withAuthFetch('/api/blocks', {
        method: 'POST',
        body: JSON.stringify({ blocked_id: blockUserId.trim() }),
      });
      setBlockUserId('');
      setSuccess('User blocked.');
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to block user'));
    } finally {
      setSaving(false);
    }
  };

  const unblockUser = async (blockedId: string) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await withAuthFetch(`/api/blocks?blocked_id=${encodeURIComponent(blockedId)}`, {
        method: 'DELETE',
      });
      setSuccess('User unblocked.');
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to unblock user'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-8 text-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
      )}
      {success && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">{success}</div>
      )}

      <section className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-4 space-y-3">
        <h2 className="text-lg font-bold">Security</h2>
        <button
          type="button"
          disabled={saving}
          onClick={() => void patchSettings({ two_factor_enabled: !settings.two_factor_enabled })}
          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-left text-sm disabled:opacity-50"
        >
          Two-factor authentication:{' '}
          <span className="text-green-400">{settings.two_factor_enabled ? 'Enabled' : 'Disabled'}</span>
        </button>
        <p className="text-xs text-gray-500">
          When enabled, your login flow should require OTP verification via your auth provider.
        </p>
        <div className="space-y-2 rounded-lg border border-white/10 bg-black/60 p-3">
          <h3 className="text-sm font-semibold">Blocked users</h3>
          <div className="flex gap-2">
            <input
              value={blockUserId}
              onChange={(e) => setBlockUserId(e.target.value)}
              placeholder="User ID to block"
              className="flex-1 rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void blockUser()}
              className="rounded-lg border border-red-400/30 bg-red-500/20 px-3 text-sm text-red-300 disabled:opacity-50"
            >
              Block
            </button>
          </div>
          <div className="space-y-2">
            {blockedUsers.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-xs"
              >
                <span className="text-gray-300">{item.blocked?.username || item.blocked_id}</span>
                <button type="button" onClick={() => void unblockUser(item.blocked_id)} className="text-red-300 hover:text-red-200">
                  Unblock
                </button>
              </div>
            ))}
            {blockedUsers.length === 0 && <div className="text-xs text-gray-600">No blocked users.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
