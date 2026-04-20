'use client';

import type { ProfileTab } from '@/lib/ruehl/queries/profile';

const TABS: { key: ProfileTab; label: string }[] = [
  { key: 'posts', label: 'Posts' },
  { key: 'powr', label: 'POWR' },
  { key: 'likes', label: 'Likes' },
  { key: 'lifted', label: 'Lifted' },
];

type Props = {
  active: ProfileTab;
  onChange: (tab: ProfileTab) => void;
  tabIds?: string;
};

export default function ProfileTabs({ active, onChange, tabIds }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Profile content"
      className="mt-2 flex w-full border-b border-[var(--border-subtle)]"
      id={tabIds}
    >
      {TABS.map((t, i) => {
        const selected = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`profile-tab-${t.key}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`relative flex-1 py-3 text-center text-[13px] font-semibold transition-colors ${
              selected ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
            }`}
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const next =
                  e.key === 'ArrowRight'
                    ? (i + 1) % TABS.length
                    : (i - 1 + TABS.length) % TABS.length;
                onChange(TABS[next].key);
              }
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChange(t.key);
              }
            }}
          >
            {t.label}
            {selected ? (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--accent-violet-bright)]" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
