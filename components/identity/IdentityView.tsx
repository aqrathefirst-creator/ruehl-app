import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { IdentityPagePayload, RuehlProfilePage } from '@/lib/ruehl/queries/profileServer';
import type { CurrentSoundDisplay } from '@/lib/ruehl/queries/profile';
import VerifiedBadge from '@/components/profile/VerifiedBadge';
import CurrentSoundCard from '@/components/profile/CurrentSoundCard';
import { formatCompact } from '@/lib/ruehl/formatNumber';

type Props = {
  profile: RuehlProfilePage;
  currentSound: CurrentSoundDisplay | null;
  identity: IdentityPagePayload;
};

export default function IdentityView({ profile, currentSound, identity }: Props) {
  const un = String(profile.username || 'user').replace(/^@+/, '');
  const profileHref = `/${encodeURIComponent(un)}`;
  const initial = (un[0] || 'U').toUpperCase();

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      {/* Immersive hero */}
      <div className="relative min-h-[320px] overflow-hidden bg-[#050505]">
        <div className="pointer-events-none absolute left-[10%] top-8 h-44 w-44 rounded-full bg-[rgba(120,40,200,0.08)] blur-2xl" />
        <div className="pointer-events-none absolute right-[8%] top-12 h-36 w-36 rounded-full bg-[rgba(220,60,100,0.06)] blur-xl" />
        <div className="pointer-events-none absolute bottom-16 left-[34%] h-36 w-36 rounded-full bg-[rgba(0,180,120,0.05)] blur-xl" />

        <div className="relative z-10 flex items-center justify-between px-4 pt-4">
          <Link
            href={profileHref}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.07] text-white/70 transition hover:bg-white/10"
            aria-label="Back to profile"
          >
            <ChevronLeft className="h-[18px] w-[18px]" />
          </Link>
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1 text-[10px] font-bold tracking-[0.25em] text-white/40">
            IDENTITY
          </span>
          <span className="h-9 w-9 rounded-full bg-white/[0.04]" aria-hidden />
        </div>

        <div className="relative z-10 flex flex-col items-center px-4 pb-28 pt-6">
          <div className="mb-4 flex h-[108px] w-[108px] items-center justify-center overflow-hidden rounded-full bg-[#1a1a1a] ring-2 ring-white/10">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt=""
                width={108}
                height={108}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-4xl font-extrabold">{initial}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[26px] font-extrabold tracking-tight">@{un}</span>
            <VerifiedBadge
              badgeVerificationStatus={profile.badge_verification_status}
              isVerified={profile.is_verified}
              size={16}
            />
          </div>
        </div>

        <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-around border-t border-white/5 pt-3">
          <StatCell value={identity.liftsGiven} label="LIFTS" />
          <div className="h-7 w-px bg-white/10" />
          <StatCell value={0} label="SCROLL BACKS" />
          <div className="h-7 w-px bg-white/10" />
          <StatCell value={identity.echoCount} label="ECHOES" />
          <div className="h-7 w-px bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-[22px] font-extrabold leading-none text-white">—</span>
            <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/30">Aligned</span>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#060606] to-transparent" />
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-4 pb-28 pt-6">
        {currentSound ? (
          <section>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Sound on profile</p>
            <CurrentSoundCard sound={currentSound} />
          </section>
        ) : null}

        <section>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Lifted posts</p>
          {identity.liftedThumbs.length === 0 ? (
            <p className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-500">
              No lifted posts yet.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
              {identity.liftedThumbs.map((item) => (
                <Link
                  key={item.id}
                  href={`/post/${encodeURIComponent(item.id)}`}
                  className="relative aspect-square overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-zinc-800/80 transition hover:opacity-90"
                >
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                      sizes="(max-width: 640px) 33vw, 200px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-600">Post</div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        <Link
          href={profileHref}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-white/[0.06] text-[17px] font-extrabold text-white ring-1 ring-white/10 transition hover:bg-white/10"
        >
          View profile
        </Link>
      </div>
    </div>
  );
}

function StatCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[22px] font-extrabold leading-none tabular-nums">{formatCompact(value)}</span>
      <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/30">{label}</span>
    </div>
  );
}
