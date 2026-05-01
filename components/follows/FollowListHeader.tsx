import Link from 'next/link';
import VerificationBadge from '@/components/profile/VerificationBadge';
import type { RuehlProfile } from '@/lib/ruehl/types';

type Props = {
  profile: Pick<RuehlProfile, 'username' | 'badge_verification_status' | 'is_verified'>;
  listType: 'followers' | 'following';
};

export default function FollowListHeader({ profile, listType }: Props) {
  const un = String(profile.username || 'user').replace(/^@+/, '');
  const href = `/${encodeURIComponent(un)}`;

  return (
    <div className="mb-6">
      <Link href={href} className="text-sm text-zinc-500 transition hover:text-zinc-300">
        ← Back to profile
      </Link>
      <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold">
        @{un}
        <VerificationBadge
          status={profile.badge_verification_status ?? null}
          legacyIsVerified={profile.is_verified}
          size="md"
        />
      </h1>
      <p className="mt-1 text-zinc-400">{listType === 'followers' ? 'Followers' : 'Following'}</p>
    </div>
  );
}
