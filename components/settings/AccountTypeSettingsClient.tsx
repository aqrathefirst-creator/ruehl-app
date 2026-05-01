'use client';

import { useCallback, useEffect, useState } from 'react';
import AccountTypeSection from '@/components/settings/AccountTypeSection';
import { getErrorMessage, withAuthFetch } from '@/lib/settings/clientFetch';
import type { SettingsRecord } from '@/lib/settings/types';

export default function AccountTypeSettingsClient() {
  const [settings, setSettings] = useState<SettingsRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await withAuthFetch('/api/settings');
      setSettings(res.settings as SettingsRecord);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load account type'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>;
  }

  if (!settings) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-8 text-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <AccountTypeSection
      currentTier={settings.account_type}
      currentSubtype={settings.account_subtype}
      onUpdated={load}
    />
  );
}
