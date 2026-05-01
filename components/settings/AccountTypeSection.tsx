'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ACCOUNT_CATEGORY_LABELS,
  ACCOUNT_TYPE_DESCRIPTIONS,
  ACCOUNT_TYPE_LABELS,
  CATEGORIES_BY_TYPE,
  type AccountCategory,
  type AccountType,
} from '@/lib/ruehl/accountTypes';

const TIERS: AccountType[] = ['personal', 'business', 'media'];

type Props = {
  currentTier: AccountType;
  currentSubtype: AccountCategory;
  onUpdated: () => void | Promise<void>;
};

async function withAuthFetch(path: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Missing auth session');

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(path, { ...options, headers });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof json.error === 'string' ? json.error : 'Request failed');
  }
  return json;
}

export default function AccountTypeSection({ currentTier, currentSubtype, onUpdated }: Props) {
  const [tier, setTier] = useState<AccountType>(currentTier);
  const [subtype, setSubtype] = useState<AccountCategory>(currentSubtype);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTier(currentTier);
    setSubtype(currentSubtype);
  }, [currentTier, currentSubtype]);

  const handleTierChange = (newTier: AccountType) => {
    setTier(newTier);
    const first = CATEGORIES_BY_TYPE[newTier][0];
    setSubtype(first);
  };

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await withAuthFetch('/api/account-type', {
        method: 'POST',
        body: JSON.stringify({ account_type: tier, account_subtype: subtype }),
      });
      await onUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }, [tier, subtype, onUpdated]);

  const subtypes = CATEGORIES_BY_TYPE[tier];
  const canSave = tier !== currentTier || subtype !== currentSubtype;

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-4 space-y-4">
      <h2 className="text-lg font-bold">Account type</h2>

      <div className="space-y-3">
        {TIERS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTierChange(t)}
            className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition ${
              tier === t
                ? 'border-purple-400/60 bg-purple-500/15'
                : 'border-white/10 bg-black/60 hover:border-white/20'
            }`}
          >
            <div className="font-semibold text-white">{ACCOUNT_TYPE_LABELS[t]}</div>
            <div className="mt-1 text-xs text-gray-500">{ACCOUNT_TYPE_DESCRIPTIONS[t]}</div>
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="account-category" className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500">
          Category
        </label>
        <select
          id="account-category"
          value={subtype}
          onChange={(e) => setSubtype(e.target.value as AccountCategory)}
          className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2.5 text-sm text-white"
        >
          {subtypes.map((s) => (
            <option key={s} value={s}>
              {ACCOUNT_CATEGORY_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {tier !== 'personal' && (
        <p className="text-xs text-gray-500">Business and Media accounts are always public.</p>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
      )}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={!canSave || saving}
        className="w-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save account type'}
      </button>
    </section>
  );
}
