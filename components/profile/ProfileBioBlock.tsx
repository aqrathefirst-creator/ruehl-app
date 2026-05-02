import AccountTypeChip from '@/components/profile/AccountTypeChip';
import type { RuehlProfilePage } from '@/lib/ruehl/queries/profileServer';
import {
  profileAccountTypeLabel,
  profileBioBody,
  profileWebsiteDisplayLabel,
  profileWebsiteOpenUrl,
} from '@/lib/ruehl/profileDisplay';

type Props = {
  profile: RuehlProfilePage;
};

export default function ProfileBioBlock({ profile }: Props) {
  const bio = profileBioBody(profile);
  const websiteRaw = String(profile.website || '').trim();
  const websiteHref = profileWebsiteOpenUrl(websiteRaw);
  const websiteLabel = profileWebsiteDisplayLabel(websiteRaw);
  const typeLabel = profileAccountTypeLabel(profile);
  const showCategory = Boolean(profile.display_category_label);

  return (
    <div className="px-4 py-3">
      <div className="space-y-0">
        {bio ? (
          <p
            className={`whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-200 ${websiteHref ? 'mb-0' : ''}`}
          >
            {bio}
          </p>
        ) : (
          <p className={`text-sm text-zinc-500 ${websiteHref ? 'mb-0' : ''}`}>No bio added yet.</p>
        )}
        {websiteHref && websiteLabel ? (
          <a
            href={websiteHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0 block break-all text-sm text-white hover:underline"
          >
            {websiteLabel}
          </a>
        ) : null}
      </div>

      {showCategory ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <AccountTypeChip
            accountType={profile.account_type}
            accountSubtype={profile.account_subtype}
            displayCategoryLabel={profile.display_category_label}
          />
          {typeLabel ? (
            <div className="text-xs uppercase tracking-wider text-zinc-500">
              {typeLabel}
              {profile.isPrivateAccount ? ' · Private' : ' · Public'}
            </div>
          ) : profile.isPrivateAccount ? (
            <div className="text-xs uppercase tracking-wider text-zinc-500">Private account</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
