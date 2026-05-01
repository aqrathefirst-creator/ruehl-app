'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RuehlProfilePage } from '@/lib/ruehl/queries/profileServer';
import {
  getPowrPostsByUser,
  getDropsByUser,
  getEchoesByUser,
  getLiftedPostsByUser,
  type LiftedPostForProfile,
  type ProfileDropRow,
  type ProfileDropEchoRow,
} from '@/lib/ruehl/queries/profileTabs';
import PowrPostCard from '@/components/profile/cards/PowrPostCard';
import DropCard from '@/components/profile/cards/DropCard';
import EchoCard from '@/components/profile/cards/EchoCard';
import LiftedItemCard from '@/components/profile/cards/LiftedItemCard';
import type { RuehlPost } from '@/lib/ruehl/types';

export type ProfileSurfaceTab = 'powr' | 'drops' | 'echoes' | 'lifts';

type Props = {
  profile: RuehlProfilePage;
  canViewTabs: boolean;
};

const TABS: { key: ProfileSurfaceTab; label: string }[] = [
  { key: 'powr', label: 'POWR' },
  { key: 'drops', label: 'DROPS' },
  { key: 'echoes', label: 'Echoes' },
  { key: 'lifts', label: 'Lifts' },
];

export default function ProfileTabs({ profile, canViewTabs }: Props) {
  const [active, setActive] = useState<ProfileSurfaceTab>('powr');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [readyTab, setReadyTab] = useState<ProfileSurfaceTab | null>(null);
  const [powr, setPowr] = useState<RuehlPost[] | null>(null);
  const [drops, setDrops] = useState<ProfileDropRow[] | null>(null);
  const [echoes, setEchoes] = useState<ProfileDropEchoRow[] | null>(null);
  const [lifted, setLifted] = useState<LiftedPostForProfile[] | null>(null);

  const loadSeq = useRef(0);

  const load = useCallback(
    async (tab: ProfileSurfaceTab) => {
      if (!profile.id || !canViewTabs) return;
      const seq = ++loadSeq.current;
      setLoading(true);
      setErr(null);
      try {
        if (tab === 'powr') {
          const rows = await getPowrPostsByUser(profile.id);
          if (seq !== loadSeq.current) return;
          setPowr(rows);
        } else if (tab === 'drops') {
          const rows = await getDropsByUser(profile.id);
          if (seq !== loadSeq.current) return;
          setDrops(rows);
        } else if (tab === 'echoes') {
          const rows = await getEchoesByUser(profile.id);
          if (seq !== loadSeq.current) return;
          setEchoes(rows);
        } else {
          const rows = await getLiftedPostsByUser(profile.id);
          if (seq !== loadSeq.current) return;
          setLifted(rows);
        }
        if (seq === loadSeq.current) setReadyTab(tab);
      } catch (e) {
        if (seq === loadSeq.current) setErr(e instanceof Error ? e.message : 'Could not load tab');
      } finally {
        if (seq === loadSeq.current) setLoading(false);
      }
    },
    [profile.id, canViewTabs],
  );

  useEffect(() => {
    if (!canViewTabs) return;
    void load(active);
  }, [active, canViewTabs, load]);

  if (!canViewTabs) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <p className="text-sm text-zinc-400">
          This account is private. Follow @{String(profile.username || '').replace(/^@+/, '')} on Ruehl to see
          posts, drops, and more.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div
        role="tablist"
        aria-label="Profile collections"
        className="flex w-full gap-1 overflow-x-auto border-b border-zinc-800 px-2"
      >
        {TABS.map((t, i) => {
          const selected = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className={`relative shrink-0 rounded-t-lg px-4 py-3 text-[13px] font-semibold transition-colors ${
                selected ? 'text-white' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
              }`}
              onClick={() => setActive(t.key)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const next =
                    e.key === 'ArrowRight' ? (i + 1) % TABS.length : (i - 1 + TABS.length) % TABS.length;
                  setActive(TABS[next]!.key);
                }
              }}
            >
              {t.label}
              {selected ? (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[#a855f7]" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="min-h-[200px] px-2 py-4" role="tabpanel">
        {err ? <p className="px-2 text-center text-sm text-red-400">{err}</p> : null}
        {loading && !err ? (
          <p className="px-2 text-center text-sm text-zinc-500">Loading…</p>
        ) : null}

        {!loading &&
          active === 'powr' &&
          readyTab === 'powr' &&
          (powr?.length
            ? powr.map((p) => (
                <PowrPostCard
                  key={p.id}
                  post={p}
                  profileUsername={profile.username}
                  profileAvatarUrl={profile.avatar_url}
                  profileBadgeStatus={profile.badge_verification_status}
                  profileIsVerified={profile.is_verified}
                />
              ))
            : null)}
        {!loading && active === 'powr' && readyTab === 'powr' && powr?.length === 0 ? (
          <p className="px-2 text-center text-sm text-zinc-500">No POWR posts yet.</p>
        ) : null}

        {!loading &&
          active === 'drops' &&
          readyTab === 'drops' &&
          (drops?.length
            ? drops.map((d) => (
                <DropCard
                  key={d.id}
                  drop={d}
                  profileUsername={profile.username}
                  profileAvatarUrl={profile.avatar_url}
                  profileBadgeStatus={profile.badge_verification_status}
                  profileIsVerified={profile.is_verified}
                />
              ))
            : null)}
        {!loading && active === 'drops' && readyTab === 'drops' && drops?.length === 0 ? (
          <p className="px-2 text-center text-sm text-zinc-500">No drops yet.</p>
        ) : null}

        {!loading &&
          active === 'echoes' &&
          readyTab === 'echoes' &&
          (echoes?.length
            ? echoes.map((d) => (
                <EchoCard
                  key={d.id}
                  echo={d}
                  profileUsername={profile.username}
                  profileAvatarUrl={profile.avatar_url}
                  profileBadgeStatus={profile.badge_verification_status}
                  profileIsVerified={profile.is_verified}
                />
              ))
            : null)}
        {!loading && active === 'echoes' && readyTab === 'echoes' && echoes?.length === 0 ? (
          <p className="px-2 text-center text-sm text-zinc-500">No echoes yet.</p>
        ) : null}

        {!loading &&
          active === 'lifts' &&
          readyTab === 'lifts' &&
          (lifted?.length ? lifted.map((p) => <LiftedItemCard key={p.id} post={p} />) : null)}
        {!loading && active === 'lifts' && readyTab === 'lifts' && lifted?.length === 0 ? (
          <p className="px-2 text-center text-sm text-zinc-500">No lifts yet.</p>
        ) : null}
      </div>
    </div>
  );
}
