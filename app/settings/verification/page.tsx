import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/server/supabaseServer';
import { getLatestVerificationSubmission } from '@/lib/ruehl/queries/verificationServer';
import { getProfile } from '@/lib/ruehl/queries/profile';
import VerificationFlow from '@/components/verification/VerificationFlow';

export default async function VerificationSettingsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect('/login');
  }

  const [profile, submission] = await Promise.all([
    getProfile(user.id, supabase),
    getLatestVerificationSubmission(user.id, supabase),
  ]);

  if (!profile) {
    redirect('/settings');
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link
          href="/settings"
          className="text-sm text-zinc-500 transition hover:text-zinc-300"
        >
          ← Back to settings
        </Link>
        <h1 className="mt-2 mb-6 text-2xl font-bold text-[var(--text-primary)]">Verify your account</h1>
        <VerificationFlow profile={profile} submission={submission} />
      </div>
    </div>
  );
}
