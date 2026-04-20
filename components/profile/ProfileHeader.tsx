'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { RuehlProfile } from '@/lib/ruehl/types';
import VerificationBadge from '@/components/profile/VerificationBadge';
import AccountTypeChip from '@/components/profile/AccountTypeChip';
import ContactInfoChips from '@/components/profile/ContactInfoChips';

type Stats = {
  posts: number;
  followers: number;
  following: number;
};

type Props = {
  profile: RuehlProfile;
  stats: Stats;
  isOwnProfile: boolean;
  loading?: boolean;
  onFollowClick: () => void;
  onMessageClick: () => void;
  followLoading?: boolean;
  isFollowing?: boolean;
};

function identityText(p: RuehlProfile): string {
  const id = String(p.identity_text || '').trim();
  if (id) return id;
  return String(p.bio || '').trim();
}

export default function ProfileHeader({
  profile,
  stats,
  isOwnProfile,
  loading,
  onFollowClick,
  onMessageClick,
  followLoading,
  isFollowing,
}: Props) {
  const un = String(profile.username || 'user').replace(/^@+/, '');
  const line = identityText(profile);
  const emptyCopy = 'No bio added yet.';

  if (loading) {
    return (
      <div className="flex w-full flex-col items-center border-b border-[var(--border-subtle)] px-4 pb-6 pt-2 md:items-start">
        <div
          className="mb-3 h-[90px] w-[90px] shrink-0 rounded-[var(--radius-avatar-outer)] bg-[var(--bg-elevated)]"
          style={{ boxShadow: 'inset 0 0 0 2px var(--avatar-ring)' }}
        />
        <div className="h-8 w-40 rounded-md bg-[var(--bg-elevated)]" />
        <div className="mt-2 h-4 w-64 max-w-full rounded bg-[var(--bg-elevated)]" />
        <div className="mt-4 h-20 w-full max-w-sm rounded-[14px] bg-[var(--bg-tertiary)]" />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center border-b border-[var(--border-subtle)] px-4 pb-6 pt-2 md:items-start">
      <div
        className="mb-3 flex h-[90px] w-[90px] shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-avatar-outer)] bg-[var(--bg-tertiary)] p-0.5"
        style={{ boxShadow: 'inset 0 0 0 2px var(--avatar-ring)' }}
      >
        <div className="flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-[var(--radius-avatar-inner)] bg-[var(--bg-tertiary)]">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              width={84}
              height={84}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <span
              className="text-[var(--text-primary)]"
              style={{ fontSize: 'var(--font-size-profile-username)', fontWeight: 800 }}
            >
              {un.charAt(0).toUpperCase() || 'U'}
            </span>
          )}
        </div>
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-1 md:max-w-none md:items-start">
        <div className="flex flex-wrap items-center justify-center gap-1.5 md:justify-start">
          <h1
            className="text-[var(--text-primary)]"
            style={{ fontSize: 'var(--font-size-profile-username)', fontWeight: 800, lineHeight: 1.1 }}
          >
            @{un}
          </h1>
          <VerificationBadge
            status={profile.badge_verification_status}
            legacyIsVerified={profile.is_verified}
            size="md"
          />
        </div>

        <AccountTypeChip
          accountType={profile.account_type}
          accountCategory={profile.account_category}
          displayCategoryLabel={profile.display_category_label}
        />

        <p
          className="mt-1 max-w-[260px] text-center text-[var(--text-caption)] md:max-w-md md:text-left"
          style={{ fontSize: 'var(--font-size-caption)', lineHeight: 1.45 }}
        >
          {line || emptyCopy}
        </p>

        <ContactInfoChips
          contactEmail={profile.contact_email}
          contactPhone={profile.contact_phone}
          website={profile.website}
          displayContactInfo={profile.display_contact_info}
        />
      </div>

      <div className="mt-4 flex w-full max-w-sm flex-wrap items-center justify-center gap-2 md:max-w-none md:justify-start">
        {isOwnProfile ? (
          <Link
            href="/edit-profile"
            className="min-h-[34px] min-w-[120px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-6 py-2 text-center text-[12px] font-semibold text-[var(--text-secondary)]"
          >
            Edit Profile
          </Link>
        ) : (
          <>
            <button
              type="button"
              onClick={onFollowClick}
              disabled={followLoading}
              className={`min-h-[36px] min-w-[120px] rounded-[18px] px-8 text-[13px] font-bold text-[var(--text-primary)] ${
                isFollowing
                  ? 'border border-[var(--border-medium)] bg-transparent'
                  : 'bg-[var(--accent-violet)]'
              }`}
            >
              {followLoading ? '…' : isFollowing ? 'Following' : 'Follow'}
            </button>
            <button
              type="button"
              onClick={onMessageClick}
              className="min-h-[36px] min-w-[100px] rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-6 text-[13px] font-semibold text-[var(--text-secondary)]"
            >
              Message
            </button>
          </>
        )}
      </div>

      <div className="mt-4 flex w-full max-w-md rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] py-3 md:max-w-lg">
        <div className="flex flex-1 flex-col items-center">
          <span className="text-[var(--text-primary)]" style={{ fontSize: 'var(--font-size-stats-value)', fontWeight: 800 }}>
            {stats.posts}
          </span>
          <span
            className="mt-1 text-[var(--text-caption)]"
            style={{
              fontSize: 'var(--font-size-stats-label)',
              letterSpacing: '0.06em',
              fontWeight: 600,
            }}
          >
            POSTS
          </span>
        </div>
        <div className="my-1.5 w-px bg-[var(--border-subtle)]" />
        <Link href={`/followers/${profile.id}`} className="flex flex-1 flex-col items-center">
          <span className="text-[var(--text-primary)]" style={{ fontSize: 'var(--font-size-stats-value)', fontWeight: 800 }}>
            {stats.followers}
          </span>
          <span
            className="mt-1 text-[var(--text-caption)]"
            style={{
              fontSize: 'var(--font-size-stats-label)',
              letterSpacing: '0.06em',
              fontWeight: 600,
            }}
          >
            FOLLOWERS
          </span>
        </Link>
        <div className="my-1.5 w-px bg-[var(--border-subtle)]" />
        <Link href={`/following/${profile.id}`} className="flex flex-1 flex-col items-center">
          <span className="text-[var(--text-primary)]" style={{ fontSize: 'var(--font-size-stats-value)', fontWeight: 800 }}>
            {stats.following}
          </span>
          <span
            className="mt-1 text-[var(--text-caption)]"
            style={{
              fontSize: 'var(--font-size-stats-label)',
              letterSpacing: '0.06em',
              fontWeight: 600,
            }}
          >
            FOLLOWING
          </span>
        </Link>
      </div>
    </div>
  );
}
