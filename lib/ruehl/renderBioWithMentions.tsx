import Link from 'next/link';
import type { ReactNode } from 'react';

const MENTION_REGEX = /@([a-zA-Z0-9_.]+)/g;

/** Branded violet matching app CTAs (native-style mention color). */
const MENTION_LINK_CLASS = 'font-medium text-[#a855f7] hover:underline';

/**
 * Splits bio text on @mentions and renders each mention as a profile link (no DB validation; v1).
 */
export function renderBioWithMentions(bio: string): ReactNode {
  if (!bio) return null;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(MENTION_REGEX.source, MENTION_REGEX.flags);

  while ((match = re.exec(bio)) !== null) {
    if (match.index > lastIndex) {
      parts.push(bio.slice(lastIndex, match.index));
    }
    const username = match[1];
    parts.push(
      <Link
        key={`${match.index}-${username}`}
        href={`/${encodeURIComponent(username)}`}
        className={MENTION_LINK_CLASS}
      >
        @{username}
      </Link>
    );
    lastIndex = re.lastIndex;
  }

  if (lastIndex < bio.length) {
    parts.push(bio.slice(lastIndex));
  }

  return parts;
}
