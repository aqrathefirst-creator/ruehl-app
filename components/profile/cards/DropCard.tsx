import type { ProfileDropRow } from '@/lib/ruehl/queries/profileTabs';
import AppViewCta from '@/components/profile/cards/AppViewCta';

type Props = { drop: ProfileDropRow };

export default function DropCard({ drop }: Props) {
  const cap = String(drop.caption || '').trim() || 'Voice drop';
  const st = String(drop.status || '—');

  return (
    <article className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400/80">Drop</p>
      <p className="mt-1 line-clamp-3 text-[14px] font-medium text-white">{cap}</p>
      <p className="mt-2 text-[12px] text-zinc-500">
        <span className="rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-[11px] uppercase text-zinc-400">{st}</span>
        {drop.scheduled_for ? (
          <span className="ml-2">{new Date(drop.scheduled_for).toLocaleString()}</span>
        ) : null}
      </p>
      <AppViewCta />
    </article>
  );
}
