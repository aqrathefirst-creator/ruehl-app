export function getAuthRedirectUrl(path = '/verify-account') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envSiteUrl) {
    return `${envSiteUrl.replace(/\/$/, '')}${normalizedPath}`;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${normalizedPath}`;
  }

  return undefined;
}