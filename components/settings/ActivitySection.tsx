'use client';

import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage, withAuthFetch } from '@/lib/settings/clientFetch';
import type { ActivitySummary } from '@/lib/settings/types';

export default function ActivitySection() {
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await withAuthFetch('/api/activity/summary');
      setActivity(res as ActivitySummary);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load activity'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-8 text-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (error) {
    return <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-4 space-y-3">
      <h2 className="text-lg font-bold">Activity</h2>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/10 bg-black/60 p-3">
          <div className="text-xs text-gray-500">Liked posts</div>
          <div className="mt-1 text-xl font-bold">{activity?.liked_posts.length || 0}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/60 p-3">
          <div className="text-xs text-gray-500">Saved posts</div>
          <div className="mt-1 text-xl font-bold">{activity?.saved_posts.length || 0}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/60 p-3">
          <div className="text-xs text-gray-500">Comments</div>
          <div className="mt-1 text-xl font-bold">{activity?.comments.length || 0}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/60 p-3">
          <div className="text-xs text-gray-500">Lifted</div>
          <div className="mt-1 text-xl font-bold">{activity?.lifted_posts.length || 0}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/60 p-3">
          <div className="text-xs text-gray-500">Matches</div>
          <div className="mt-1 text-xl font-bold">{activity?.matches.length || 0}</div>
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-wide text-gray-500">Recent comments</h3>
        {(activity?.comments || []).slice(0, 3).map((item) => (
          <div key={item.id} className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-gray-300">
            {item.content}
          </div>
        ))}
        {(!activity?.comments || activity.comments.length === 0) && (
          <div className="text-xs text-gray-600">No comments yet.</div>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="text-xs uppercase tracking-wide text-gray-500">Recent likes, lifts and saves</h3>
        <div className="text-xs text-gray-300">
          Likes: {(activity?.liked_posts || []).slice(0, 5).map((i) => i.post_id.slice(0, 8)).join(', ') || 'none'}
        </div>
        <div className="text-xs text-gray-300">
          Lifts: {(activity?.lifted_posts || []).slice(0, 5).map((i) => i.post_id.slice(0, 8)).join(', ') || 'none'}
        </div>
        <div className="text-xs text-gray-300">
          Saves: {(activity?.saved_posts || []).slice(0, 5).map((i) => i.post_id.slice(0, 8)).join(', ') || 'none'}
        </div>
      </div>
    </section>
  );
}
