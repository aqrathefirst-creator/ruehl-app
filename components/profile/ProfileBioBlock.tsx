import AccountTypeChip from '@/components/profile/AccountTypeChip';
import ContactInfoChips from '@/components/profile/ContactInfoChips';
import type { RuehlProfilePage } from '@/lib/ruehl/queries/profileServer';
import { profileAccountTypeLabel, profileBioBody } from '@/lib/ruehl/profileDisplay';

type Props = {
  profile: RuehlProfilePage;
};

export default function ProfileBioBlock({ profile }: Props) {
  const bio = profileBioBody(profile);
  const typeLabel = profileAccountTypeLabel(profile);

  return (
    <div className="space-y-2 px-4 py-3">
      {bio ? (
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-200">{bio}</p>
      ) : (
        <p className="text-sm text-zinc-500">No bio added yet.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
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
    </div>
  );
}
