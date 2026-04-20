'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getSuggestedProfiles } from '@/lib/ruehl/queries/feed';
import type { RuehlProfile } from '@/lib/ruehl/types';
import VerificationBadge from '@/components/profile/VerificationBadge';

export default function SuggestedForYouModule() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<RuehlProfile[] | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) {
      setProfiles([]);
      return;
    }
    let cancelled = false;
    void getSuggestedProfiles(userId, 5).then((rows) => {
      if (!cancelled) setProfiles(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (profiles === null) {
    return (
      <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Suggested for you</h3>
        <div className="space-y-3">
          {[0, 1, 2, 3].map((k) => (
            <div key={k} className="flex animate-pulse gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--bg-primary)]" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-24 rounded bg-[var(--bg-primary)]" />
                <div className="h-3 w-full rounded bg-[var(--bg-primary)]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (profiles.length === 0) return null;

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Suggested for you</h3>
      <ul className="space-y-3">
        {profiles.map((p) => {
          const href = p.username ? `/${encodeURIComponent(p.username)}` : `/profile/${p.id}`;
          const snippet = (p.identity_text || p.bio || '').trim().slice(0, 80);
          return (
            <li key={p.id}>
              <div className="flex gap-3">
                <Link href={href} className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[var(--bg-primary)]">
                  {p.avatar_url ? (
                    <Image src={p.avatar_url} alt="" fill className="object-cover" unoptimized sizes="40px" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-[var(--text-muted)]">
                      {(p.username || '?').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-1">
                    <Link href={href} className="truncate text-sm font-semibold text-[var(--text-primary)] hover:underline">
                      @{p.username || 'user'}
                    </Link>
                    <VerificationBadge status={p.badge_verification_status} legacyIsVerified={Boolean(p.is_verified)} size="sm" />
                  </div>
                  {snippet ? <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">{snippet}</p> : null}
                  <button
                    type="button"
                    className="mt-1 text-xs font-semibold text-[var(--accent-violet)]"
                    onClick={() => {
                      console.log('[feed] Follow intent (stub) — user:', p.id);
                    }}
                  >
                    Follow
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
