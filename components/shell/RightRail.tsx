'use client';

import type { RightRailVariant } from '@/lib/shell/rightRailVariant';

type Props = {
  variant: RightRailVariant;
};

export default function RightRail({ variant }: Props) {
  if (variant === 'none') return null;

  return (
    <aside
      className="hidden xl:fixed xl:right-0 xl:top-0 xl:z-30 xl:flex xl:h-screen xl:w-[var(--shell-right-rail)] xl:flex-col xl:border-l xl:border-[var(--border-subtle)] xl:bg-[var(--bg-primary)] xl:px-4 xl:py-6"
      aria-label="Context"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
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
            <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Current Sound</h3>
              <p className="text-xs text-[var(--text-muted)]">Placeholder — profile parity in Phase 2.3</p>
            </section>
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
