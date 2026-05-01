'use client';

import type { Drop } from '@/lib/ruehl/drops';
import type { RuehlProfile } from '@/lib/ruehl/types';
import AuthorBlock from '@/components/shared/AuthorBlock';
import { formatRelativeShort } from '@/lib/formatRelativeShort';

function dropMeta(drop: Drop): string {
  const rel = formatRelativeShort(drop.scheduledFor);
  const status = String(drop.status || '').trim();
  if (status.toLowerCase() === 'live') return 'Live now';
  return `Dropped ${rel}${status ? ` · ${status}` : ''}`;
}

type Props = {
  drop: Drop;
  author: RuehlProfile | null;
  embedded?: boolean;
};

export default function DropAuthor({ drop, author, embedded }: Props) {
  const un = String(author?.username || 'creator').replace(/^@+/, '');

  return (
    <div className={embedded ? 'pb-0' : 'border-b border-zinc-800/90 pb-4'}>
      <AuthorBlock
        username={un}
        avatarUrl={author?.avatar_url}
        badgeStatus={author?.badge_verification_status ?? null}
        legacyIsVerified={author?.is_verified}
        meta={dropMeta(drop)}
        size="md"
      />
    </div>
  );
}
