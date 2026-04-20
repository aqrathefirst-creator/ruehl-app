/**
 * Ported from `ruehl-native/lib/accountTypes.ts` — source of truth is native. Web mirrors native semantics.
 *
 * Mirrors `public.users` / `public.profiles` checks (`20260418000003_add_account_types.sql`).
 * Pure constants and helpers (no I/O).
 */

export type AccountType = 'personal' | 'business' | 'media';

export type PersonalCategory = 'personal' | 'creator' | 'artist' | 'public_figure';
export type BusinessCategory = 'brand' | 'company' | 'shop' | 'restaurant';
export type MediaCategory = 'radio_station' | 'magazine' | 'podcast' | 'publication';
export type AccountCategory = PersonalCategory | BusinessCategory | MediaCategory;

/** Stored on profiles/users as badge verification lifecycle (native + migrations). */
export type BadgeVerificationStatus = 'pending' | 'approved' | 'rejected' | null;

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  personal: 'Personal',
  business: 'Business',
  media: 'Media',
};

export const ACCOUNT_CATEGORY_LABELS: Record<AccountCategory, string> = {
  personal: 'Personal',
  creator: 'Creator',
  artist: 'Artist',
  public_figure: 'Public Figure',
  brand: 'Brand',
  company: 'Company',
  shop: 'Shop',
  restaurant: 'Restaurant',
  radio_station: 'Radio Station',
  magazine: 'Magazine',
  podcast: 'Podcast',
  publication: 'Publication',
};

export const CATEGORIES_BY_TYPE: Record<AccountType, readonly AccountCategory[]> = {
  personal: ['personal', 'creator', 'artist', 'public_figure'] as const,
  business: ['brand', 'company', 'shop', 'restaurant'] as const,
  media: ['radio_station', 'magazine', 'podcast', 'publication'] as const,
};

export const ACCOUNT_TYPE_DESCRIPTIONS: Record<AccountType, string> = {
  personal: 'For individual users, creators, and artists sharing their voice.',
  business: 'For brands, companies, shops, and restaurants. Verified badge and contact tools.',
  media: 'For radio stations, podcasts, magazines, and publications. Native home for voice content.',
};

/** Returns true when the account type is personal. */
export function isPersonalAccount(type: AccountType): boolean {
  return type === 'personal';
}

/** Returns true when the account type is business. */
export function isBusinessAccount(type: AccountType): boolean {
  return type === 'business';
}

/** Returns true when the account type is media. */
export function isMediaAccount(type: AccountType): boolean {
  return type === 'media';
}

/** Returns true for business and media tiers (must be public-facing in product rules). */
export function mustBePublic(type: AccountType): boolean {
  return type === 'business' || type === 'media';
}

/** Returns true when badge verification is required for the tier (business and media). */
export function requiresVerification(type: AccountType): boolean {
  return type === 'business' || type === 'media';
}

/** Returns true only for personal accounts (full music library access). */
export function canUseFullMusicLibrary(type: AccountType): boolean {
  return type === 'personal';
}

/** Returns the list of categories allowed for the given account type (same as DB constraint). */
export function getValidCategoriesForType(type: AccountType): readonly AccountCategory[] {
  return CATEGORIES_BY_TYPE[type];
}

/** Returns whether `category` is valid for `type` (matches DB check constraint). */
export function isCategoryValidForType(type: AccountType, category: AccountCategory): boolean {
  const allowed = CATEGORIES_BY_TYPE[type] as readonly AccountCategory[];
  return allowed.includes(category);
}

/** Returns the account type that owns `category` (inverse of category pick lists). */
export function getTypeForCategory(category: AccountCategory): AccountType {
  if ((CATEGORIES_BY_TYPE.personal as readonly AccountCategory[]).includes(category)) {
    return 'personal';
  }
  if ((CATEGORIES_BY_TYPE.business as readonly AccountCategory[]).includes(category)) {
    return 'business';
  }
  return 'media';
}

/** User-facing label for a category, with a string fallback if the key is missing. */
export function getCategoryLabel(category: AccountCategory): string {
  return ACCOUNT_CATEGORY_LABELS[category] ?? String(category);
}

/** User-facing label for an account type, with a string fallback if the key is missing. */
export function getTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPE_LABELS[type] ?? String(type);
}

export const DEFAULT_ACCOUNT_TYPE: AccountType = 'personal';
export const DEFAULT_ACCOUNT_CATEGORY: AccountCategory = 'personal';
