'use client';

import { Globe, Mail, Phone } from 'lucide-react';

type Props = {
  contactEmail: string | null | undefined;
  contactPhone: string | null | undefined;
  website: string | null | undefined;
  displayContactInfo: boolean | null | undefined;
};

const chipClass =
  'inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--border-medium)] bg-[var(--bg-secondary)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-opacity hover:opacity-90';

/**
 * Mirrors native `ProfileScreen.tsx`: all chips require `displayContactInfo` and at least one field.
 */
export default function ContactInfoChips({
  contactEmail,
  contactPhone,
  website,
  displayContactInfo,
}: Props) {
  const email = String(contactEmail || '').trim();
  const phone = String(contactPhone || '').trim();
  const web = String(website || '').trim();

  if (!displayContactInfo || (!email && !phone && !web)) return null;

  return (
    <div className="mt-3 flex flex-wrap justify-center gap-2 md:justify-start">
      {email ? (
        <a href={`mailto:${email}`} className={chipClass}>
          <Mail className="h-3 w-3 text-[var(--text-muted)]" aria-hidden />
          Email
        </a>
      ) : null}
      {phone ? (
        <a href={`tel:${phone}`} className={chipClass}>
          <Phone className="h-3 w-3 text-[var(--text-muted)]" aria-hidden />
          Call
        </a>
      ) : null}
      {web ? (
        <a
          href={web.startsWith('http') ? web : `https://${web}`}
          target="_blank"
          rel="noopener noreferrer"
          className={chipClass}
        >
          <Globe className="h-3 w-3 text-[var(--text-muted)]" aria-hidden />
          Website
        </a>
      ) : null}
    </div>
  );
}
