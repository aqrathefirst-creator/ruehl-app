export type RightRailVariant = 'home' | 'profile' | 'post' | 'none';

const RESERVED_USERNAME_SEGMENTS = new Set([
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
]);

/**
 * Maps pathname → right-rail placeholder variant (WEB_DIRECTION §2).
 */
export function deriveRightRailVariant(pathname: string): RightRailVariant {
  const p = pathname.split('?')[0] || '/';

  if (p === '/' || p === '/now') return 'home';
  if (p.startsWith('/profile/')) return 'profile';

  const soundMatch = /^\/sound\/([^/]+)\/?$/.exec(p);
  if (soundMatch) return 'post';

  const single = /^\/([^/]+)\/?$/.exec(p);
  if (single) {
    const seg = single[1].toLowerCase();
    if (!RESERVED_USERNAME_SEGMENTS.has(seg) && seg.length > 0 && !seg.includes('.')) {
      return 'profile';
    }
  }

  return 'none';
}
