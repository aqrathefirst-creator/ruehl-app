import type { RuehlProfile } from '@/lib/ruehl/types';

/**
 * Bold primary header title — `@username` handle only (matches native @{username}).
 * Does not use `identity_text` or `full_name`.
 */
export function profileDisplayName(p: RuehlProfile): string {
  return String(p.username || 'User').replace(/^@+/, '');
}

/**
 * Optional display name (`profiles.full_name`).
 * Render inline on the same row as `@username`, separated by a middle dot (e.g. · Name).
 */
export function profileFullName(p: RuehlProfile): string | null {
  const name = String(p.full_name || '').trim();
  return name.length > 0 ? name : null;
}

/** Bio body — `profiles.bio` only; independent of `identity_text`. */
export function profileBioBody(p: RuehlProfile): string | null {
  const bio = String(p.bio || '').trim();
  return bio.length > 0 ? bio : null;
}

export function profileAccountTypeLabel(p: RuehlProfile): string | null {
  const t = p.account_type;
  if (!t) return null;
  return t === 'personal' ? 'Personal' : t === 'business' ? 'Business' : t === 'media' ? 'Media' : null;
}
