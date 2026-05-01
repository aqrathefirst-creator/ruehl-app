import type { RuehlProfile } from '@/lib/ruehl/types';

/** First line of identity / display title for profile header. */
export function profileDisplayName(p: RuehlProfile): string {
  const id = String(p.identity_text || '').trim();
  if (id) return id.split('\n')[0]!.trim();
  return String(p.username || 'User').replace(/^@+/, '');
}

/** Bio body below identity line — mirrors legacy ProfileHeader parsing. */
export function profileBioBody(p: RuehlProfile): string | null {
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

export function profileAccountTypeLabel(p: RuehlProfile): string | null {
  const t = p.account_type;
  if (!t) return null;
  return t === 'personal' ? 'Personal' : t === 'business' ? 'Business' : t === 'media' ? 'Media' : null;
}
