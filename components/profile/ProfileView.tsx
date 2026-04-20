'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { RuehlProfile } from '@/lib/ruehl/types';
import {
  getFollowersCount,
  getFollowingCount,
  getProfileLenient,
  getProfilePostCount,
  getProfilePosts,
  type ProfileTab,
} from '@/lib/ruehl/queries/profile';
import type { RuehlPost } from '@/lib/ruehl/types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import { useProfileRailUserId } from '@/components/shell/ProfileRailUserIdProvider';
import ProfileTabs from '@/components/profile/ProfileTabs';
import ProfileTabContent from '@/components/profile/ProfileTabContent';
import ProfileLoadingSkeleton from '@/components/profile/ProfileLoadingSkeleton';

const PAGE = 18;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

function parseTab(raw: string | null): ProfileTab {
  if (raw === 'powr' || raw === 'likes' || raw === 'lifted' || raw === 'posts') return raw;
  return 'posts';
}

export default function ProfileView() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const routeParam = String((params?.id ?? params?.username ?? '') as string);
  const tabParam = parseTab(searchParams.get('tab'));

  const [boot, setBoot] = useState(true);
  const [profile, setProfile] = useState<RuehlProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [followingThem, setFollowingThem] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const [activeTab, setActiveTab] = useState<ProfileTab>(tabParam);
  const [tabPosts, setTabPosts] = useState<RuehlPost[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const { setProfileUserId } = useProfileRailUserId();

  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) setViewerId(data.user?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBoot(true);
      setNotFound(false);
      try {
        const p = await getProfileLenient(routeParam);
        if (cancelled) return;
        if (!p?.id) {
          setProfile(null);
          setNotFound(true);
          setBoot(false);
          return;
        }
        setProfile(p);
      } catch {
        if (!cancelled) {
          setProfile(null);
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setBoot(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeParam]);

  useEffect(() => {
    setProfileUserId(null);
  }, [routeParam, setProfileUserId]);

  useEffect(() => {
    if (boot || notFound || !profile?.id) {
      return;
    }
    setProfileUserId(profile.id);
    return () => setProfileUserId(null);
  }, [boot, notFound, profile?.id, setProfileUserId]);

  useEffect(() => {
    if (!profile?.id) return;
    const un = String(profile.username || '').trim().toLowerCase();
    if (un && pathname?.startsWith('/profile/') && isUuid(routeParam)) {
      router.replace(`/${un}`);
    }
  }, [profile, pathname, routeParam, router]);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [pc, fc, fol] = await Promise.all([
          getProfilePostCount(profile.id),
          getFollowersCount(profile.id),
          getFollowingCount(profile.id),
        ]);
        if (cancelled) return;
        setStats({ posts: pc, followers: fc, following: fol });
      } catch {
        /* stats best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id || !viewerId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', viewerId)
        .eq('following_id', profile.id)
        .maybeSingle();
      if (!cancelled) setFollowingThem(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, viewerId]);

  const applyTabQuery = useCallback(
    (t: ProfileTab) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set('tab', t);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const loadTab = useCallback(
    async (t: ProfileTab, start: number, append: boolean) => {
      if (!profile?.id) return;
      setTabLoading(true);
      try {
        const rows = await getProfilePosts(profile.id, t, PAGE, start);
        if (append && rows.length === 0) {
          setHasMore(false);
        } else {
          setHasMore(rows.length === PAGE);
        }
        if (append) setTabPosts((prev) => [...prev, ...rows]);
        else setTabPosts(rows);
      } finally {
        setTabLoading(false);
      }
    },
    [profile?.id],
  );

  useEffect(() => {
    if (!profile?.id) return;
    void loadTab(activeTab, 0, false);
  }, [profile?.id, activeTab, loadTab]);

  const onTabChange = (t: ProfileTab) => {
    setActiveTab(t);
    applyTabQuery(t);
  };

  const onLoadMore = () => {
    void loadTab(activeTab, tabPosts.length, true);
  };

  const onFollowClick = () => {
    console.log('[profile] Follow action stub — wiring in a later phase');
    setFollowBusy(true);
    setTimeout(() => setFollowBusy(false), 400);
  };

  const onMessageClick = () => {
    console.log('[profile] Message action stub — Phase 2.7');
  };

  const isOwn = useMemo(
    () => Boolean(viewerId && profile?.id && viewerId === profile.id),
    [viewerId, profile?.id],
  );

  if (boot) {
    return <ProfileLoadingSkeleton />;
  }

  if (notFound || !profile) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
        <p className="text-lg font-semibold text-[var(--text-primary)]">Profile not found</p>
        <p className="mt-2 text-[14px] text-[var(--text-muted)]">
          This account doesn&apos;t exist or was removed.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[960px] overflow-x-hidden px-4 pb-28 pt-2 md:pb-12">
      <ProfileHeader
        profile={profile}
        stats={stats}
        isOwnProfile={isOwn}
        loading={false}
        onFollowClick={onFollowClick}
        onMessageClick={onMessageClick}
        followLoading={followBusy}
        isFollowing={followingThem}
      />

      <ProfileTabs active={activeTab} onChange={onTabChange} />

      <ProfileTabContent
        tab={activeTab}
        posts={tabPosts}
        loading={tabLoading}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
      />
    </div>
  );
}
