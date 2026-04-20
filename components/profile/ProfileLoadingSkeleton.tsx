'use client';

export default function ProfileLoadingSkeleton() {
  return (
    <div className="w-full max-w-[960px] px-4 pb-24 pt-4">
      <div className="flex flex-col items-center md:items-start">
        <div
          className="mb-3 h-[90px] w-[90px] rounded-[var(--radius-avatar-outer)] bg-[var(--bg-elevated)]"
          style={{ boxShadow: 'inset 0 0 0 2px var(--avatar-ring)' }}
        />
        <div className="h-9 w-48 rounded-md bg-[var(--bg-elevated)]" />
        <div className="mt-3 h-4 w-2/3 max-w-sm rounded bg-[var(--bg-elevated)]" />
        <div className="mt-6 h-[72px] w-full max-w-md rounded-[14px] bg-[var(--bg-tertiary)]" />
        <div className="mt-4 h-12 w-full max-w-md rounded-[14px] bg-[var(--bg-tertiary)]" />
        <div className="mt-6 flex w-full gap-2 border-b border-[var(--border-subtle)] pb-2">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="h-10 flex-1 rounded-md bg-[var(--bg-elevated)]" />
          ))}
        </div>
        <div className="mt-4 grid w-full grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-[var(--radius-media)] bg-[var(--bg-elevated)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
