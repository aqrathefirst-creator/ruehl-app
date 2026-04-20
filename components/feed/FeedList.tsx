'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RuehlPost, RuehlProfile } from '@/lib/ruehl/types';
import type { AccountCategory } from '@/lib/ruehl/accountTypes';
import { getHomeFeed } from '@/lib/ruehl/queries/feed';
import FeedCard from '@/components/feed/FeedCard';

const PAGE = 15;

const PROFILE_SELECT =
  'id, username, avatar_url, bio, identity_text, account_type, account_category, badge_verification_status, is_verified, created_at';

function isVideoUrl(url: string) {
  const clean = url.split('?')[0]?.toLowerCase() || '';
  return /\.(mp4|webm|ogg|mov|m4v)$/i.test(clean);
}

function mapProfile(r: Record<string, unknown>): RuehlProfile {
  return {
    id: String(r.id ?? ''),
    username: r.username == null ? null : String(r.username),
    avatar_url: r.avatar_url == null ? null : String(r.avatar_url),
    bio: r.bio == null ? null : String(r.bio),
    identity_text: r.identity_text == null ? null : String(r.identity_text),
    account_type:
      r.account_type === 'personal' || r.account_type === 'business' || r.account_type === 'media'
        ? r.account_type
        : null,
    account_category:
      r.account_category == null ? null : (String(r.account_category) as AccountCategory),
    badge_verification_status:
      r.badge_verification_status === 'pending' ||
      r.badge_verification_status === 'approved' ||
      r.badge_verification_status === 'rejected'
        ? r.badge_verification_status
        : null,
    contact_email: null,
    contact_phone: null,
    website: null,
    display_category_label: null,
    display_contact_info: null,
    category_picked_at: null,
    is_verified: typeof r.is_verified === 'boolean' ? r.is_verified : null,
    created_at: r.created_at == null ? null : String(r.created_at),
  };
}

export default function FeedList() {
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<RuehlPost[]>([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [lastBatchLen, setLastBatchLen] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profilesById, setProfilesById] = useState<Record<string, RuehlProfile>>({});
  const [liftPostIds, setLiftPostIds] = useState<Set<string>>(new Set());
  const [liftCounts, setLiftCounts] = useState<Record<string, number>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  const loadProfiles = useCallback(async (postsBatch: RuehlPost[]) => {
    const ids = [...new Set(postsBatch.map((p) => p.user_id).filter(Boolean))];
    if (ids.length === 0) return;
    const { data } = await supabase.from('profiles').select(PROFILE_SELECT).in('id', ids);
    const next: Record<string, RuehlProfile> = {};
    for (const row of data || []) {
      const id = String((row as { id: string }).id);
      next[id] = mapProfile(row as Record<string, unknown>);
    }
    setProfilesById((prev) => ({ ...prev, ...next }));
  }, []);

  const loadEngagement = useCallback(
    async (postsBatch: RuehlPost[], uid: string | null) => {
      const postIds = postsBatch.map((p) => p.id);
      if (postIds.length === 0) return;

      const liftsRes = await supabase.from('post_lifts').select('post_id, user_id').in('post_id', postIds);
      const lifts = liftsRes.data;

      let savedRows: { post_id: string | null }[] = [];
      if (uid && postIds.length > 0) {
        const savedRes = await supabase.from('saved_posts').select('post_id').eq('user_id', uid).in('post_id', postIds);
        savedRows = savedRes.data || [];
      }

      const countByPost = (lifts || []).reduce<Record<string, number>>((acc, row) => {
        const pid = (row as { post_id?: string }).post_id;
        if (!pid) return acc;
        acc[pid] = (acc[pid] || 0) + 1;
        return acc;
      }, {});

      setLiftCounts((prev) => {
        const merged = { ...prev };
        for (const p of postIds) {
          merged[p] = countByPost[p] ?? 0;
        }
        return merged;
      });

      const mine = new Set<string>();
      if (uid) {
        for (const row of lifts || []) {
          const r = row as { post_id?: string; user_id?: string };
          if (r.user_id === uid && r.post_id) mine.add(r.post_id);
        }
      }
      setLiftPostIds((prev) => new Set([...prev, ...mine]));

      if (uid && savedRows.length > 0) {
        const s = new Set(savedRows.map((r) => r.post_id).filter((id): id is string => Boolean(id)));
        setSavedIds((prev) => new Set([...prev, ...s]));
      }
    },
    [],
  );

  const fetchPage = useCallback(
    async (nextOffset: number, append: boolean) => {
      const uid = userId;
      if (nextOffset === 0) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const batch = await getHomeFeed(uid, PAGE, nextOffset);
        setLastBatchLen(batch.length);
        if (append) setPosts((p) => [...p, ...batch]);
        else setPosts(batch);
        await loadProfiles(batch);
        await loadEngagement(batch, uid);
        setNextOffset(nextOffset + batch.length);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load feed');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userId, loadProfiles, loadEngagement],
  );

  useEffect(() => {
    void fetchPage(0, false);
  }, [userId, fetchPage]);

  const handleToggleLift = async (post: RuehlPost) => {
    if (!userId) return;
    const lifted = liftPostIds.has(post.id);
    setLiftPostIds((prev) => {
      const n = new Set(prev);
      if (lifted) n.delete(post.id);
      else n.add(post.id);
      return n;
    });
    setLiftCounts((prev) => ({
      ...prev,
      [post.id]: Math.max(0, (prev[post.id] ?? 0) + (lifted ? -1 : 1)),
    }));
    if (lifted) {
      await supabase.from('post_lifts').delete().match({ user_id: userId, post_id: post.id });
    } else {
      await supabase.from('post_lifts').insert({ user_id: userId, post_id: post.id });
    }
    const { data: lifts } = await supabase.from('post_lifts').select('post_id').eq('post_id', post.id);
    const c = (lifts || []).length;
    setLiftCounts((prev) => ({ ...prev, [post.id]: c }));
  };

  const handleToggleSave = async (post: RuehlPost) => {
    if (!userId) return;
    const saved = savedIds.has(post.id);
    if (saved) {
      await supabase.from('saved_posts').delete().match({ user_id: userId, post_id: post.id });
      setSavedIds((prev) => {
        const n = new Set(prev);
        n.delete(post.id);
        return n;
      });
    } else {
      await supabase.from('saved_posts').insert({ user_id: userId, post_id: post.id });
      setSavedIds((prev) => new Set(prev).add(post.id));
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="space-y-6 px-1">
        {[0, 1, 2].map((k) => (
          <div key={k} className="animate-pulse space-y-3 border-b border-[var(--border-subtle)] pb-6">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-[var(--bg-secondary)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-[var(--bg-secondary)]" />
                <div className="h-3 w-full rounded bg-[var(--bg-secondary)]" />
                <div className="h-48 w-full rounded-[var(--radius-card)] bg-[var(--bg-secondary)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="py-8 text-center text-sm text-red-400">{error}</p>;
  }

  if (!loading && posts.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-6 py-12 text-center">
        <p className="text-[var(--text-muted)]">Nothing here yet</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {posts.map((post) => (
        <FeedCard
          key={post.id}
          post={post}
          author={profilesById[post.user_id] ?? null}
          liftCount={liftCounts[post.id] ?? 0}
          hasLifted={liftPostIds.has(post.id)}
          isSaved={savedIds.has(post.id)}
          onToggleLift={() => handleToggleLift(post)}
          onToggleSave={() => handleToggleSave(post)}
          isVideoUrl={isVideoUrl}
        />
      ))}
      <div className="py-6 text-center">
        <button
          type="button"
          disabled={loadingMore || posts.length === 0 || lastBatchLen < PAGE}
          onClick={() => void fetchPage(nextOffset, true)}
          className="rounded-full border border-[var(--border-medium)] px-5 py-2 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-40"
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      </div>
    </div>
  );
}
