'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUserDeletedAt, restoreAccount } from '@/lib/api/moderation';

export default function DeletedGate() {
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getCurrentUserDeletedAt().then((deletedAt) => {
      if (deletedAt) {
        const scheduled = new Date(new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000);
        setScheduledDate(scheduled.toLocaleDateString());
      }
    });
  }, []);

  const handleRestore = async () => {
    setLoading(true);
    try {
      await restoreAccount();
      window.location.href = '/';
    } catch {
      setLoading(false);
      alert('Failed to restore account. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black px-6">
      <div className="max-w-md text-center">
        <h1 className="mb-6 text-3xl font-bold text-[#a855f7]">RUEHL</h1>
        <h2 className="mb-4 text-xl text-white">Your account is scheduled for deletion</h2>
        <p className="mb-2 text-gray-400">You can restore your account by tapping below.</p>
        <p className="mb-2 text-gray-400">After 30 days, your data will be permanently deleted.</p>
        {scheduledDate && <p className="mb-8 text-sm text-gray-500">Scheduled deletion: {scheduledDate}</p>}
        {!scheduledDate && <div className="mb-8" />}
        <button
          type="button"
          onClick={() => void handleRestore()}
          disabled={loading}
          className="mb-3 block w-full rounded-lg bg-[#a855f7] px-6 py-3 text-white disabled:opacity-50"
        >
          {loading ? 'Restoring...' : 'Restore Account'}
        </button>
        <button type="button" onClick={() => void handleSignOut()} className="text-sm text-gray-500 underline">
          Sign Out
        </button>
      </div>
    </div>
  );
}
