'use client';

export default function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-[600px] px-4 pb-24 pt-4 md:pt-6">
      <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-6 py-10">
        <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">Notifications</h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Notifications will appear here. Full notifications experience ships in a future update.
        </p>
      </section>
    </div>
  );
}
