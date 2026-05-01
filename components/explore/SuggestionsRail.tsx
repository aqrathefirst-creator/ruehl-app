import Link from 'next/link';
import type { RuehlProfile } from '@/lib/ruehl/types';
import VerificationBadge from '@/components/profile/VerificationBadge';

type Props = { profiles: RuehlProfile[] };

export default function SuggestionsRail({ profiles }: Props) {
  if (profiles.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">People to follow</h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-thin">
        {profiles
          .filter((p) => String(p.username || '').trim().length > 0)
          .map((p) => {
            const handle = String(p.username || '').trim();
            const initial = handle.replace(/^@+/, '').slice(0, 1).toUpperCase();
            return (
              <Link
                key={p.id}
                href={`/${handle}`}
                className="w-32 shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3 transition hover:border-zinc-700"
              >
                <div className="mx-auto mb-2 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-lg font-bold text-zinc-300">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initial
                  )}
                </div>
                <div className="flex items-center justify-center gap-1 truncate text-center text-sm font-bold">
                  <span className="truncate">@{handle}</span>
                  <VerificationBadge
                    status={p.badge_verification_status}
                    legacyIsVerified={p.is_verified}
                    size="sm"
                  />
                </div>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
