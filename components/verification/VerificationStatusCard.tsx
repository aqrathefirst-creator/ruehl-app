import VerificationBadge from '@/components/profile/VerificationBadge';
import type { VerificationSubmissionRecord } from '@/lib/ruehl/queries/verificationServer';

type Props = {
  submission: VerificationSubmissionRecord;
};

export default function VerificationStatusCard({ submission }: Props) {
  const { status, submitted_at, reviewed_at } = submission;

  if (status === 'pending') {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
        <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-yellow-400">Under review</div>
        <h2 className="mb-2 text-xl font-bold text-white">Your submission is being reviewed</h2>
        <p className="text-zinc-400">
          We will notify you when a decision is made. Reviews typically take 3–7 business days.
        </p>
        {submitted_at ? (
          <p className="mt-4 text-sm text-zinc-500">Submitted {new Date(submitted_at).toLocaleDateString()}</p>
        ) : null}
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
        <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-400">Verified</div>
        <h2 className="mb-2 flex flex-wrap items-center gap-2 text-xl font-bold text-white">
          Your account is verified{' '}
          <VerificationBadge status="approved" size={16} />
        </h2>
        <p className="text-zinc-400">The verified badge appears next to your username across Ruehl.</p>
        {reviewed_at ? (
          <p className="mt-4 text-sm text-zinc-500">Approved {new Date(reviewed_at).toLocaleDateString()}</p>
        ) : null}
      </div>
    );
  }

  return null;
}
