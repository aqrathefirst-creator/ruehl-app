'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { requestAccountDeletion } from '@/lib/api/moderation';

type Props = {
  username: string;
};

export default function DeleteAccountSection({ username }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== username) return;
    setLoading(true);
    try {
      await requestAccountDeletion();
      await supabase.auth.signOut();
      localStorage.removeItem('user_id');
      localStorage.removeItem('ruehl:avatar-url');
      localStorage.removeItem('optimistic_post');
      sessionStorage.removeItem('ruehl:user');
      sessionStorage.removeItem('ruehl:profile');
      sessionStorage.removeItem('ruehl:pending-verification');
      sessionStorage.removeItem('ruehl:pending-verification-last-sent');
      window.location.href = '/';
    } catch {
      setLoading(false);
      alert('Failed to delete account. Please try again or contact support.');
    }
  };

  return (
    <section className="mt-8 border-t border-white/10 pt-8">
      <h2 className="mb-2 text-lg font-semibold text-red-500">Delete Account</h2>
      <p className="mb-4 text-sm text-gray-400">
        Delete your account and all your content. You have 30 days to sign in and restore your account before deletion is permanent.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-500 px-4 py-2 text-red-500 hover:bg-red-500/10"
      >
        Delete Account
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6">
            <h3 className="mb-2 text-lg font-semibold text-white">Delete your account?</h3>
            <p className="mb-2 text-sm text-gray-400">This will delete your account and all your content.</p>
            <p className="mb-4 text-sm text-gray-400">
              You have 30 days to sign in and restore your account. After 30 days, your data will be permanently deleted.
            </p>
            <p className="mb-2 text-sm text-gray-300">
              Type your username <span className="font-mono text-white">{username}</span> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
              className="mb-4 w-full rounded border border-gray-700 bg-black px-3 py-2 font-mono text-white"
              placeholder={username}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setConfirmText('');
                }}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={confirmText !== username || loading}
                className="rounded bg-red-500 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                {loading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
