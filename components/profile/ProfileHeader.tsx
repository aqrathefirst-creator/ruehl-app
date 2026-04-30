import Image from 'next/image';
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
};

function displayName(p: RuehlProfile): string {
  const id = String(p.identity_text || '').trim();
  if (id) return id.split('\n')[0]!.trim();
  return String(p.username || 'User').replace(/^@+/, '');
}

function handleLine(p: RuehlProfile): string | null {
  const un = `@${String(p.username || '').replace(/^@+/, '')}`;
  return un.length > 1 ? un : null;
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

export default function ProfileHeader({ profile, currentSound }: Props) {
  const name = displayName(profile);
  const handle = handleLine(profile);
  const bio = bioBody(profile);
  const typeLabel = accountTypeLabel(profile);
  const un = String(profile.username || 'user').replace(/^@+/, '');
  const initial = (un[0] || 'U').toUpperCase();

  return (
    <header className="w-full">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-b-2xl bg-gradient-to-br from-violet-950/80 via-black to-fuchsia-950/40 ring-1 ring-violet-500/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgba(168,85,247,0.25),transparent_50%),radial-gradient(ellipse_at_80%_20%,rgba(236,72,153,0.12),transparent_45%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black to-transparent" />
        <div className="absolute -bottom-10 left-1/2 flex -translate-x-1/2 md:left-8 md:translate-x-0">
          <div
            className="flex h-[104px] w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-black bg-zinc-900 shadow-lg shadow-violet-900/30"
            style={{ boxShadow: '0 0 0 1px rgba(168,85,247,0.35), 0 12px 40px rgba(0,0,0,0.65)' }}
          >
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt=""
                width={104}
                height={104}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-3xl font-extrabold text-white">{initial}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-2 pt-14">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-white">{name}</h1>
          <VerifiedBadge
            badgeVerificationStatus={profile.badge_verification_status}
            isVerified={profile.is_verified}
            size={16}
          />
        </div>
        {handle ? (
          <p className="mt-0.5 text-sm font-medium text-violet-300/90">{handle}</p>
        ) : null}
        {bio ? (
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-300">{bio}</p>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">No bio added yet.</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AccountTypeChip
            accountType={profile.account_type}
            accountCategory={profile.account_category}
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
    </header>
  );
}
