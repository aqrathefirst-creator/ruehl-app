/** Single-segment paths that are not /@username profiles */
const RESERVED_SEGMENTS = new Set([
  'login',
  'explore',
  'charts',
  'sessions',
  'settings',
  'notifications',
  'create',
  'admin',
  'onboarding',
  'verify-account',
  'reset-password',
  'messages',
  'saved-sounds',
  'sound',
  'followers',
  'following',
  'powr',
  'room',
  'edit-profile',
  'profile',
  'now',
  'saved',
]);

export function isProfileStylePath(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '') || '/';
  if (p.startsWith('/profile/')) return true;
  const m = /^\/([^/]+)$/.exec(p);
  if (!m) return false;
  const seg = m[1].toLowerCase();
  return !RESERVED_SEGMENTS.has(seg) && seg.length > 0;
}
