import type { ReactNode } from 'react';

type AdminLayoutProps = {
  sidebar: ReactNode;
  children: ReactNode;
};

export default function AdminLayout({ sidebar, children }: AdminLayoutProps) {
  return (
    <div className="mx-auto w-full max-w-[1400px] p-6">
      <div className="grid min-h-[calc(100vh-48px)] grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="h-[calc(100vh-48px)] overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          {sidebar}
        </aside>
        <section className="min-w-0 overflow-x-hidden">{children}</section>
      </div>
    </div>
  );
}
