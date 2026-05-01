'use client';

import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage, withAuthFetch } from '@/lib/settings/clientFetch';
import type { SettingsRecord } from '@/lib/settings/types';

export default function PrivacySection() {
  const [settings, setSettings] = useState<SettingsRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await withAuthFetch('/api/settings');
      setSettings(res.settings as SettingsRecord);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load privacy settings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (partial: Partial<SettingsRecord>) => {
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
        <h2 className="text-lg font-bold">Privacy</h2>
        <button
          type="button"
          disabled={saving}
          onClick={() => void patch({ is_private: !settings.is_private })}
          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-left text-sm disabled:opacity-50"
        >
          Private account: <span className="text-green-400">{settings.is_private ? 'On' : 'Off'}</span>
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void patch({ show_activity_status: !settings.show_activity_status })}
          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-left text-sm disabled:opacity-50"
        >
          Show activity status: <span className="text-green-400">{settings.show_activity_status ? 'On' : 'Off'}</span>
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void patch({ allow_tagging: !settings.allow_tagging })}
          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-left text-sm disabled:opacity-50"
        >
          Allow tagging: <span className="text-green-400">{settings.allow_tagging ? 'On' : 'Off'}</span>
        </button>
        <div className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm">
          <div className="mb-2">Allow messages from</div>
          <div className="flex flex-wrap gap-2">
            {(['everyone', 'followers', 'none'] as const).map((value) => (
              <button
                key={value}
                type="button"
                disabled={saving}
                onClick={() => void patch({ allow_messages_from: value })}
                className={`rounded-full border px-3 py-1.5 text-xs disabled:opacity-50 ${
                  settings.allow_messages_from === value
                    ? 'border-green-400/50 bg-green-500/20 text-green-300'
                    : 'border-white/15 bg-white/5 text-gray-300'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
