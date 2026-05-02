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

/** Bio body — `public.profiles.bio` only; independent of `identity_text`. */
export function profileBioBody(p: RuehlProfile): string | null {
  const bio = String(p.bio || '').trim();
  return bio.length > 0 ? bio : null;
}

export function profileAccountTypeLabel(p: RuehlProfile): string | null {
  const t = p.account_type;
  if (!t) return null;
  return t === 'personal' ? 'Personal' : t === 'business' ? 'Business' : t === 'media' ? 'Media' : null;
}

/** Absolute URL for opening the profile website (adds https:// when missing). */
export function profileWebsiteOpenUrl(raw: string | null | undefined): string | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

/** Display hostname/path without scheme for inline links. */
export function profileWebsiteDisplayLabel(raw: string | null | undefined): string | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  let hostPath = s.replace(/^https?:\/\//i, '');
  hostPath = hostPath.replace(/\/$/, '');
  return hostPath.length > 0 ? hostPath : null;
}
