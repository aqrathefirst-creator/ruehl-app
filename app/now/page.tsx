'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import VerificationBadge from '@/components/profile/VerificationBadge';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import { getNowFeed } from '@/lib/ruehl/queries/feed';
import { parseVerificationStatus } from '@/lib/ruehl/verification';
import type { RuehlPost, RuehlProfile } from '@/lib/ruehl/types';
import type { AccountCategory } from '@/lib/ruehl/accountTypes';

const PAGE_SIZE = 12;
const PROFILE_SELECT =
  'id, username, avatar_url, bio, identity_text, badge_verification_status, is_verified, verified, created_at';

const USERS_ACCOUNT_SELECT = 'id, account_type, account_subtype, account_category';

function formatRelativeTime(createdAt: string | null): string {
  if (!createdAt) return '';
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(ageMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function mapProfile(row: Record<string, unknown>): RuehlProfile {
  const rawBadge = String(row.badge_verification_status ?? '').trim().toLowerCase();
  const parsedBadge = parseVerificationStatus(rawBadge);
  const legacyVerified =
    typeof row.is_verified === 'boolean'
      ? row.is_verified
      : typeof row.verified === 'boolean'
        ? row.verified
        : null;
  const badge = parsedBadge ?? (legacyVerified === true ? 'approved' : null);

  return {
    id: String(row.id ?? ''),
    username: row.username == null ? null : String(row.username),
    avatar_url: row.avatar_url == null ? null : String(row.avatar_url),
    bio: row.bio == null ? null : String(row.bio),
    identity_text: row.identity_text == null ? null : String(row.identity_text),
    account_type: (() => {
      const t = String(row.account_type || '').trim().toLowerCase();
      return t === 'personal' || t === 'business' || t === 'media' ? t : null;
    })(),
    account_category: (row.account_category == null ? null : String(row.account_category)) as AccountCategory | null,
    badge_verification_status: badge,
    contact_email: null,
    contact_phone: null,
    website: null,
    display_category_label: null,
    display_contact_info: null,
    category_picked_at: null,
    is_verified: legacyVerified,
    created_at: row.created_at == null ? null : String(row.created_at),
  };
}

export default function NowPage() {
  const { user } = useUser();
  const [posts, setPosts] = useState<RuehlPost[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, RuehlProfile>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [lastBatchCount, setLastBatchCount] = useState(0);

  const loadProfiles = useCallback(async (batch: RuehlPost[]) => {
    const ids = [...new Set(batch.map((post) => post.user_id).filter(Boolean))];
    if (ids.length === 0) return;
    const [{ data: profs }, { data: users }] = await Promise.all([
      supabase.from('profiles').select(PROFILE_SELECT).in('id', ids),
      supabase.from('users').select(USERS_ACCOUNT_SELECT).in('id', ids),
    ]);
    const uById = new Map(
      (users || []).map((r) => {
        const u = r as Record<string, unknown>;
        return [String(u.id ?? ''), u];
      }),
    );
    const mapped: Record<string, RuehlProfile> = {};
    for (const row of profs || []) {
      const pr = row as Record<string, unknown>;
      const id = String(pr.id ?? '');
      const u = uById.get(id);
      const merged = {
        ...pr,
        ...(u
          ? {
              account_type: u.account_type,
              account_subtype: u.account_subtype,
              account_category: u.account_category,
            }
          : {}),
      };
      mapped[id] = mapProfile(merged);
    }
    setProfilesById((prev) => ({ ...prev, ...mapped }));
  }, []);

  const fetchBatch = useCallback(
    async (startOffset: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const batch = await getNowFeed(user?.id ?? null, PAGE_SIZE, startOffset);
        if (append) setPosts((prev) => [...prev, ...batch]);
        else setPosts(batch);
        await loadProfiles(batch);
        setLastBatchCount(batch.length);
        setOffset(startOffset + batch.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load Now feed');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [loadProfiles, user?.id],
  );

  useEffect(() => {
    void fetchBatch(0, false);
  }, [fetchBatch]);

  const empty = !loading && posts.length === 0;
  const postRows = useMemo(() => posts.filter((post) => !!String(post.media_url || '').trim()), [posts]);

  return (
    <div className="mx-auto w-full max-w-[600px] px-4 pb-24 pt-4 md:pt-6">
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">Now</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Video posts from the live Now surface.</p>
      </header>

      {loading && posts.length === 0 ? (
        <div className="space-y-4">
          {[0, 1, 2].map((skeleton) => (
            <div
              key={skeleton}
              className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)]"
            >
              <div className="aspect-[9/16] w-full animate-pulse bg-[var(--bg-elevated)]" />
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)]">
          {error}
        </p>
      ) : null}

      {empty ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-6 py-12 text-center">
          <p className="text-sm text-[var(--text-muted)]">No video posts yet.</p>
        </div>
      ) : null}

      <div className="space-y-6">
        {postRows.map((post) => {
          const author = profilesById[post.user_id] ?? null;
          const authorName = author?.username || 'user';
          const badgeStatus = author?.badge_verification_status ?? null;
          const legacyVerified = author?.is_verified ?? null;
          return (
            <article key={post.id} className="space-y-3">
              <div className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Link href={`/profile/${post.user_id}`} className="font-semibold text-[var(--text-primary)] hover:opacity-80">
                  @{authorName}
                </Link>
                <VerificationBadge status={badgeStatus} legacyIsVerified={legacyVerified} size="sm" />
                <span className="text-[var(--text-meta)]">{formatRelativeTime(post.created_at || null)}</span>
              </div>

              <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                <div className="relative aspect-[9/16] w-full bg-black">
                  <video
                    src={post.media_url || undefined}
                    className="h-full w-full object-cover"
                    controls
                    playsInline
                    preload="metadata"
                  />
                </div>
              </div>

              {post.content ? <p className="text-sm text-[var(--text-primary)]">{post.content}</p> : null}
              {(post.track_name || post.artist_name) ? (
                <p className="text-xs text-[var(--text-muted)]">
                  {post.track_name || 'Track'}
                  {post.artist_name ? ` - ${post.artist_name}` : ''}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>

      {!empty ? (
        <div className="pt-8 text-center">
          <button
            type="button"
            disabled={loadingMore || lastBatchCount < PAGE_SIZE}
            onClick={() => void fetchBatch(offset, true)}
            className="rounded-full border border-[var(--border-medium)] px-5 py-2 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-40"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
