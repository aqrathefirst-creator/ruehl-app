'use client';

import { supabase } from '@/lib/supabase';

export default function BannedGate() {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black px-6">
      <div className="max-w-md text-center">
        <h1 className="mb-6 text-3xl font-bold text-[#a855f7]">RUEHL</h1>
        <h2 className="mb-4 text-xl text-white">Your account has been suspended</h2>
        <p className="mb-8 text-gray-400">Contact support@ruehl.app if you believe this was made in error.</p>
        <a
          href="mailto:support@ruehl.app"
          className="mb-3 inline-block w-full rounded-lg bg-[#a855f7] px-6 py-3 text-white"
        >
          Contact Support
        </a>
        <button type="button" onClick={handleSignOut} className="text-sm text-gray-500 underline">
          Sign Out
        </button>
      </div>
    </div>
  );
}
