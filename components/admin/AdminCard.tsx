import type { ReactNode } from 'react';

type AdminCardProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function AdminCard({ title, description, actions, children, className = '' }: AdminCardProps) {
  return (
    <section className={`max-w-full overflow-hidden rounded-2xl border border-white/10 bg-[#101214] p-5 ${className}`.trim()}>
      {(title || description || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-base font-semibold text-white">{title}</h3>}
            {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
          </div>
          {actions && <div>{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
