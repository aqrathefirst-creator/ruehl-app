'use client';

import { useEffect, useState } from 'react';
import CurrentSoundCard from '@/components/profile/CurrentSoundCard';
import type { RightRailVariant } from '@/lib/shell/rightRailVariant';
import { getCurrentSound, type CurrentSoundDisplay } from '@/lib/ruehl/queries/profile';

type Props = {
  variant: RightRailVariant;
  /** Profile route only: resolved profile user id (from {@link ProfileRailUserIdProvider}). Optional / additive — non-breaking for other variants. */
  profileUserId?: string | null;
};

/**
 * Phase 2.1 shipped with stable shell APIs; Phase 2.3 explicitly adds optional `profileUserId` here
 * so profile pages can surface Current Sound without the shell importing route logic.
 */
function ProfileCurrentSoundSection({ userId }: { userId: string }) {
  const [sound, setSound] = useState<CurrentSoundDisplay | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setSound(undefined);
    void getCurrentSound(userId).then((s) => {
      if (!cancelled) setSound(s);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (sound === undefined || sound === null) return null;
  if (!sound.spotifyTrackId && !sound.previewUrl) return null;

  return (
    <section className="min-w-0 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Current Sound</h3>
      <div className="w-full min-w-0">
        <CurrentSoundCard sound={sound} />
      </div>
    </section>
  );
}

export default function RightRail({ variant, profileUserId = null }: Props) {
  if (variant === 'none') return null;

  const profileIdForSound = variant === 'profile' && profileUserId ? profileUserId : null;

  return (
    <aside
      className="hidden xl:fixed xl:right-0 xl:top-0 xl:z-30 xl:flex xl:h-screen xl:w-[var(--shell-right-rail)] xl:flex-col xl:border-l xl:border-[var(--border-subtle)] xl:bg-[var(--bg-primary)] xl:px-4 xl:py-6"
      aria-label="Context"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden">
        {variant === 'home' && (
          <>
            <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Now Trending</h3>
              <p className="text-xs text-[var(--text-muted)]">Placeholder — data wiring in Phase 2.5</p>
            </section>
            <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Suggested for you</h3>
              <p className="text-xs text-[var(--text-muted)]">Placeholder — data wiring in Phase 2.5</p>
            </section>
          </>
        )}
        {variant === 'profile' && (
          <>
            {profileIdForSound ? <ProfileCurrentSoundSection userId={profileIdForSound} /> : null}
            <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Suggested similar</h3>
              <p className="text-xs text-[var(--text-muted)]">Placeholder — data wiring in Phase 2.5</p>
            </section>
          </>
        )}
        {variant === 'post' && (
          <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">More from this creator</h3>
            <p className="text-xs text-[var(--text-muted)]">Placeholder — post shell in later phase</p>
          </section>
        )}
      </div>
    </aside>
  );
}
