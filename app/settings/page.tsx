import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import SignOutButton from '@/components/settings/SignOutButton';
import { ACCOUNT_TYPE_LABELS, type AccountType } from '@/lib/ruehl/accountTypes';
import { getProfile } from '@/lib/ruehl/queries/profile';
import { getLatestVerificationSubmission } from '@/lib/ruehl/queries/verificationServer';
import { createServerSupabase } from '@/lib/server/supabaseServer';

export default async function SettingsHubPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect('/login');
  }

  const [profile, verification] = await Promise.all([
    getProfile(user.id, supabase),
    getLatestVerificationSubmission(user.id, supabase),
  ]);

  if (!profile) {
    redirect('/login');
  }

  const tier = (profile.account_type ?? 'personal') as AccountType;
  const accountTypeLabel = ACCOUNT_TYPE_LABELS[tier] ?? 'Personal';

  const verificationLabel = (() => {
    if (!verification) return 'Get verified on Ruehl';
    if (verification.status === 'pending') return 'Under review';
    if (verification.status === 'approved') return 'Verified';
    if (verification.status === 'rejected') return 'Rejected · resubmit';
    return 'Get verified on Ruehl';
  })();

  const rows = [
    {
      href: '/settings/account',
      label: 'Account',
      subtitle: 'Email, password, delete account',
    },
    {
      href: '/settings/account-type',
      label: 'Account type',
      subtitle: accountTypeLabel,
    },
    {
      href: '/settings/privacy',
      label: 'Privacy',
      subtitle: 'Visibility, messages, tagging',
    },
    {
      href: '/settings/security',
      label: 'Security',
      subtitle: 'Two-factor authentication, blocked users',
    },
    {
      href: '/settings/activity',
      label: 'Activity',
      subtitle: 'Your activity and history',
    },
    {
      href: '/settings/verification',
      label: 'Verification',
      subtitle: verificationLabel,
    },
    {
      href: '/settings/about',
      label: 'About',
      subtitle: 'Terms, privacy policy, support, version',
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-2 text-2xl font-bold">Settings</h1>
        <p className="mb-6 text-sm text-zinc-400">Control your account, privacy, and security.</p>

        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/40">
          {rows.map((row, i) => (
            <Link
              key={row.href}
              href={row.href}
              className={`flex items-center justify-between gap-4 p-4 transition hover:bg-zinc-900/40 ${
                i < rows.length - 1 ? 'border-b border-zinc-800/60' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{row.label}</div>
                <div className="mt-0.5 truncate text-sm text-zinc-500">{row.subtitle}</div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
            </Link>
          ))}
        </div>

        <div className="mt-8">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
