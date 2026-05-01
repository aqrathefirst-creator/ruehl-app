'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/settings/clientFetch';

export default function SignOutButton() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;

      localStorage.removeItem('user_id');
      localStorage.removeItem('ruehl:avatar-url');
      localStorage.removeItem('optimistic_post');
      sessionStorage.removeItem('ruehl:pending-verification');
      sessionStorage.removeItem('ruehl:pending-verification-last-sent');

      setShowConfirm(false);
      router.replace('/login');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to sign out'));
      setSaving(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4 space-y-3">
        <h2 className="text-lg font-bold text-red-200">Session</h2>
        <p className="text-sm text-red-100/70">
          Log out of your account on this device and return to the sign in page.
        </p>
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={() => setShowConfirm(true)}
          className="w-full h-11 rounded-full border border-red-400/30 bg-red-500/20 text-sm font-semibold text-red-200 disabled:opacity-50"
        >
          Log out
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-8 pt-20 sm:items-center">
          <div className="w-full max-w-[430px] rounded-3xl border border-white/10 bg-[#121212] p-5 shadow-2xl">
            <h2 className="text-xl font-bold text-white">Confirm logout</h2>
            <p className="mt-2 text-sm text-gray-400">
              You will be signed out of this device and sent back to the sign in page.
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowConfirm(false)}
                className="flex-1 h-11 rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void logout()}
                className="flex-1 h-11 rounded-full border border-red-400/30 bg-red-500/20 text-sm font-semibold text-red-200 disabled:opacity-50"
              >
                {saving ? 'Logging out…' : 'Confirm logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
