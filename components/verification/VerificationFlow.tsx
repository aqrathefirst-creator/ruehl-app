'use client';

import { useState, useCallback } from 'react';
import type { RuehlProfile } from '@/lib/ruehl/types';
import type { VerificationSubmissionRecord } from '@/lib/ruehl/queries/verificationServer';
import { requiresVerification } from '@/lib/ruehl/accountTypes';
import VerificationStatusCard from '@/components/verification/VerificationStatusCard';
import VerificationForm from '@/components/verification/VerificationForm';
import Link from 'next/link';

type Props = {
  profile: RuehlProfile;
  submission: VerificationSubmissionRecord | null;
};

export default function VerificationFlow({ profile, submission }: Props) {
  const [current, setCurrent] = useState<VerificationSubmissionRecord | null>(submission);

  const onSubmitted = useCallback((next: VerificationSubmissionRecord) => {
    setCurrent(next);
  }, []);

  const accountType = profile.account_type;
  const eligible = accountType != null && requiresVerification(accountType);

  if (!eligible) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 text-zinc-300">
        <h2 className="text-lg font-semibold text-white">Verification is for Business and Media accounts</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Personal accounts are not eligible for the verified badge in this release. Switch to a Business or Media
          account in account settings if you represent an organization, brand, or publication.
        </p>
        <Link
          href="/settings"
          className="mt-4 inline-block text-sm font-medium text-violet-400 hover:text-violet-300"
        >
          Back to settings
        </Link>
      </div>
    );
  }

  if (current && (current.status === 'pending' || current.status === 'approved')) {
    return <VerificationStatusCard submission={current} />;
  }

  return (
    <>
      {current?.status === 'rejected' ? (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <h3 className="mb-1 font-semibold text-red-400">Previous submission not approved</h3>
          <p className="text-sm text-red-300">
            {current.rejection_reason?.trim() || 'No reason was provided. Please review the requirements and try again.'}
          </p>
          <p className="mt-2 text-sm text-red-300/90">You can submit a new request with updated information below.</p>
        </div>
      ) : null}

      <VerificationForm profile={profile} onSubmitted={onSubmitted} />
    </>
  );
}
