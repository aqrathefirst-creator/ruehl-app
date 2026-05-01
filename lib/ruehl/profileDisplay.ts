import type { RuehlProfile } from '@/lib/ruehl/types';

/**
 * Primary bold title for profile header — matches native (`@{username}` + badge).
 * Does not use `identity_text` (that is the tagline / Identity strip elsewhere).
 */
export function profileDisplayName(p: RuehlProfile): string {
  return String(p.username || 'User').replace(/^@+/, '');
}

/**
 * Optional display name shown below the bold `@username`, non-bold.
 * Maps from `profiles.full_name`.
 */
export function profileFullName(p: RuehlProfile): string | null {
  const name = String(p.full_name || '').trim();
  return name.length > 0 ? name : null;
}

/** Bio body — `profiles.bio` only (no longer intertwined with `identity_text`). */
export function profileBioBody(p: RuehlProfile): string | null {
  const bio = String(p.bio || '').trim();
  return bio.length > 0 ? bio : null;
}

export function profileAccountTypeLabel(p: RuehlProfile): string | null {
  const t = p.account_type;
  if (!t) return null;
  return t === 'personal' ? 'Personal' : t === 'business' ? 'Business' : t === 'media' ? 'Media' : null;
}
