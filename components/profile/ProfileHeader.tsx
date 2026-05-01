import Image from 'next/image';
import Link from 'next/link';
import { MoreHorizontal, Settings, Shield, UserCircle } from 'lucide-react';
import type { RuehlProfile } from '@/lib/ruehl/types';
import type { RuehlProfilePage } from '@/lib/ruehl/queries/profileServer';
import type { CurrentSoundDisplay } from '@/lib/ruehl/queries/profile';
import VerifiedBadge from '@/components/profile/VerifiedBadge';
import AccountTypeChip from '@/components/profile/AccountTypeChip';
import ContactInfoChips from '@/components/profile/ContactInfoChips';
import CurrentSoundCard from '@/components/profile/CurrentSoundCard';

type Props = {
  profile: RuehlProfilePage;
  currentSound: CurrentSoundDisplay | null;
  /** Viewer is the profile owner — enables header corner controls. */
  isOwnProfile?: boolean;
  /** Platform admin — show shield link next to Settings (own profile only). */
  showAdminIcon?: boolean;
};

function displayName(p: RuehlProfile): string {
  const id = String(p.identity_text || '').trim();
  if (id) return id.split('\n')[0]!.trim();
  return String(p.username || 'User').replace(/^@+/, '');
}

function bioBody(p: RuehlProfile): string | null {
  const id = String(p.identity_text || '').trim();
  const bio = String(p.bio || '').trim();
  if (id && bio && bio !== id) return bio;
  if (!id && bio) return bio;
  if (id) {
    const lines = id.split('\n');
    if (lines.length > 1) return lines.slice(1).join('\n').trim() || null;
  }
  return null;
}

function accountTypeLabel(p: RuehlProfile): string | null {
  const t = p.account_type;
  if (!t) return null;
  return t === 'personal' ? 'Personal' : t === 'business' ? 'Business' : t === 'media' ? 'Media' : null;
}

export default function ProfileHeader({
  profile,
  currentSound,
  isOwnProfile = false,
  showAdminIcon = false,
}: Props) {
  const name = displayName(profile);
  const bio = bioBody(profile);
  const typeLabel = accountTypeLabel(profile);
  const un = String(profile.username || 'user').replace(/^@+/, '');
  const initial = (un[0] || 'U').toUpperCase();
  const identityHref = `/${encodeURIComponent(un)}/identity`;

  return (
    <header className="relative border-b border-zinc-800/60 px-4 pb-4 pt-6">
      {isOwnProfile ? (
        <div className="absolute right-4 top-4 z-10 flex items-center gap-0.5">
          <Link
            href="/settings"
            aria-label="Settings"
            className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
          >
            <Settings size={20} strokeWidth={2} />
          </Link>
          {showAdminIcon ? (
            <Link
              href="/admin"
              aria-label="Admin"
              className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
            >
              <Shield size={20} strokeWidth={2} />
            </Link>
          ) : null}
          <button
            type="button"
            aria-label="More options"
            className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
          >
            <MoreHorizontal size={20} strokeWidth={2} />
          </button>
        </div>
      ) : null}

      <div className="flex items-start gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-zinc-700/80 bg-zinc-900 md:h-24 md:w-24">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              width={96}
              height={96}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-extrabold text-white md:text-3xl">
              {initial}
            </span>
          )}
        </div>

        <div className={`min-w-0 flex-1 pt-0.5 ${isOwnProfile ? 'pr-14 sm:pr-24' : ''}`}>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">{name}</h1>
            <VerifiedBadge
              badgeVerificationStatus={profile.badge_verification_status}
              isVerified={profile.is_verified}
              size={16}
            />
            <Link
              href={identityHref}
              className="text-zinc-400 transition hover:text-white"
              title="View Identity"
              aria-label="View Identity"
            >
              <UserCircle className="h-5 w-5 md:h-[22px] md:w-[22px]" strokeWidth={1.75} />
            </Link>
          </div>

          <Link href={`/${encodeURIComponent(un)}`} className="mt-1 inline-block text-sm font-medium text-[#a855f7] hover:underline">
            @{un}
          </Link>

          {bio ? (
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-300">{bio}</p>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">No bio added yet.</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AccountTypeChip
              accountType={profile.account_type}
              accountSubtype={profile.account_subtype}
              displayCategoryLabel={profile.display_category_label}
            />
            {typeLabel ? (
              <span className="rounded-full border border-zinc-700/80 bg-zinc-900/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                {typeLabel}
                {profile.isPrivateAccount ? ' · Private' : ' · Public'}
              </span>
            ) : profile.isPrivateAccount ? (
              <span className="rounded-full border border-zinc-700/80 bg-zinc-900/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                Private account
              </span>
            ) : null}
          </div>

          <ContactInfoChips
            contactEmail={profile.contact_email}
            contactPhone={profile.contact_phone}
            website={profile.website}
            displayContactInfo={profile.display_contact_info}
          />

          {currentSound ? (
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Sound on profile</p>
              <CurrentSoundCard sound={currentSound} />
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
