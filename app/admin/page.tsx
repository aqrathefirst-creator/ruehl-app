'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type SectionId =
  | 'dashboard'
  | 'users'
  | 'content'
  | 'moderation'
  | 'reports'
  | 'music'
  | 'genres'
  | 'feed'
  | 'support'
  | 'system';

type DashboardMetrics = {
  total_users: number;
  active_users: number;
  posts_today: number;
  reports_pending: number;
};

type DashboardGrowth = {
  users_growth_7d: number;
  posts_growth_7d: number;
};

type AdminUser = {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_admin: boolean;
  shadow_banned?: boolean;
  suspended_until?: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type UserDetail = {
  user: {
    id: string;
    email?: string | null;
    phone?: string | null;
    created_at?: string | null;
    last_sign_in_at?: string | null;
  } | null;
  profile: {
    id: string;
    username: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    is_verified?: boolean;
    shadow_banned?: boolean;
    suspended_until?: string | null;
    is_admin?: boolean;
    created_at?: string | null;
  } | null;
  activity: Array<{ id: string; type: string; created_at?: string | null }>;
  posts: Array<{
    id: string;
    content: string;
    media_url?: string | null;
    created_at?: string | null;
    hidden_by_admin?: boolean;
    discovery_disabled?: boolean;
    moderation_state?: string;
    visibility_state?: string;
  }>;
  reports: Array<{
    id: string;
    reason: string;
    created_at: string;
    admin_status?: string;
    admin_action?: string | null;
  }>;
  notes: Array<{ id: string; note: string; created_at: string; admin_user_id: string }>;
};

type VerificationRequest = {
  id: string;
  user_id: string;
  full_name: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

type ContentItem = {
  id: string;
  user_id: string;
  content: string;
  media_url?: string | null;
  created_at: string;
  hidden_by_admin?: boolean;
  discovery_disabled?: boolean;
  moderation_state?: string;
  visibility_state?: string;
  trending_override?: boolean;
};

type ReportItem = {
  id: string;
  reporter_id: string;
  target_user_id?: string | null;
  target_post_id?: string | null;
  reason: string;
  created_at: string;
  admin_status: string;
  admin_action?: string | null;
  admin_note?: string | null;
};

type SoundItem = {
  id: string;
  track_name: string;
  artist_name: string;
  usage_count?: number;
  is_enabled?: boolean;
  is_trending?: boolean;
  category?: string | null;
  preview_url?: string | null;
};

type GenreItem = {
  id: string;
  name: string;
  priority_weight: number;
  is_active: boolean;
};

type FeedItem = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  boosted_until?: string | null;
  discovery_disabled?: boolean;
  trending_override?: boolean;
  visibility_state?: string;
};

type SupportTicket = {
  id: string;
  user_id?: string | null;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_note?: string | null;
  created_at: string;
};

const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'users', label: 'Users' },
  { id: 'content', label: 'Content' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'reports', label: 'Reports' },
  { id: 'music', label: 'Music' },
  { id: 'genres', label: 'Fitness / Genres' },
  { id: 'feed', label: 'Feed Control' },
  { id: 'support', label: 'Support' },
  { id: 'system', label: 'System' },
];

async function withAdminFetch(path: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Missing auth session');

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(path, { ...options, headers });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || 'Request failed');
  return json;
}

function Card({ title, value, hint, alert }: { title: string; value: string | number; hint?: string; alert?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${alert ? 'border-red-500/40 bg-red-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
      <div className="text-xs uppercase tracking-[0.16em] text-gray-500">{title}</div>
      <div className="text-3xl font-black mt-2">{value}</div>
      {hint && <div className="text-xs mt-2 text-gray-400">{hint}</div>}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');

  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>({
    total_users: 0,
    active_users: 0,
    posts_today: 0,
    reports_pending: 0,
  });
  const [dashboardGrowth, setDashboardGrowth] = useState<DashboardGrowth>({
    users_growth_7d: 0,
    posts_growth_7d: 0,
  });

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersPagination, setUsersPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [usersSearchInput, setUsersSearchInput] = useState('');
  const [usersQuery, setUsersQuery] = useState('');

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetail | null>(null);
  const [adminNoteDraft, setAdminNoteDraft] = useState('');
  const [suspendDays, setSuspendDays] = useState(7);

  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);

  const [contentFilter, setContentFilter] = useState<'all' | 'trending' | 'reported' | 'flagged'>('all');
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);

  const [reportsFilter, setReportsFilter] = useState<'pending' | 'resolved' | 'dismissed' | 'all'>('pending');
  const [reports, setReports] = useState<ReportItem[]>([]);

  const [musicQuery, setMusicQuery] = useState('');
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [newSoundTrack, setNewSoundTrack] = useState('');
  const [newSoundArtist, setNewSoundArtist] = useState('');
  const [newSoundCategory, setNewSoundCategory] = useState('');

  const [genres, setGenres] = useState<GenreItem[]>([]);
  const [newGenre, setNewGenre] = useState('');
  const [newGenreWeight, setNewGenreWeight] = useState(100);

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);

  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const verifyAdmin = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!active) return;
      if (!user) {
        router.replace('/');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) return;
      if (!profile?.is_admin) {
        router.replace('/');
        return;
      }

      setAuthorized(true);
      setCheckingAccess(false);
    };

    void verifyAdmin();

    return () => {
      active = false;
    };
  }, [router]);

  const clearFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const loadDashboard = async () => {
    const data = await withAdminFetch('/api/admin/dashboard');
    setDashboardMetrics(data.metrics as DashboardMetrics);
    setDashboardGrowth(data.growth as DashboardGrowth);
  };

  const loadUsers = async (page = usersPagination.page, query = usersQuery) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(usersPagination.pageSize) });
    if (query.trim()) params.set('query', query.trim());

    const data = await withAdminFetch(`/api/admin/users?${params.toString()}`);
    setUsers((data.items || []) as AdminUser[]);
    setUsersPagination(data.pagination as Pagination);
  };

  const loadUserDetail = async (userId: string) => {
    const data = await withAdminFetch(`/api/admin/users/${userId}`);
    setSelectedUserDetail(data as UserDetail);
  };

  const loadModeration = async () => {
    const data = await withAdminFetch('/api/admin/verification?status=pending');
    setVerificationRequests((data.items || []) as VerificationRequest[]);
  };

  const loadContent = async () => {
    const data = await withAdminFetch(`/api/admin/content?filter=${contentFilter}`);
    setContentItems((data.items || []) as ContentItem[]);
  };

  const loadReports = async () => {
    const data = await withAdminFetch(`/api/admin/reports?status=${reportsFilter}`);
    setReports((data.items || []) as ReportItem[]);
  };

  const loadMusic = async () => {
    const queryPart = musicQuery.trim() ? `?query=${encodeURIComponent(musicQuery.trim())}` : '';
    const data = await withAdminFetch(`/api/admin/music${queryPart}`);
    setSounds((data.items || []) as SoundItem[]);
  };

  const loadGenres = async () => {
    const data = await withAdminFetch('/api/admin/genres');
    setGenres((data.items || []) as GenreItem[]);
  };

  const loadFeed = async () => {
    const data = await withAdminFetch('/api/admin/feed');
    setFeedItems((data.items || []) as FeedItem[]);
  };

  const loadSupport = async () => {
    const data = await withAdminFetch('/api/admin/support');
    setSupportTickets((data.items || []) as SupportTicket[]);
  };

  useEffect(() => {
    if (!authorized) return;

    const loadSectionData = async () => {
      setLoading(true);
      clearFeedback();

      try {
        if (activeSection === 'dashboard' || activeSection === 'system') {
          await loadDashboard();
        }

        if (activeSection === 'users') {
          await loadUsers(1, usersQuery);
        }

        if (activeSection === 'moderation') {
          await loadModeration();
        }

        if (activeSection === 'content') {
          await loadContent();
        }

        if (activeSection === 'reports') {
          await loadReports();
        }

        if (activeSection === 'music') {
          await loadMusic();
        }

        if (activeSection === 'genres') {
          await loadGenres();
        }

        if (activeSection === 'feed') {
          await loadFeed();
        }

        if (activeSection === 'support') {
          await loadSupport();
        }
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load admin data');
      } finally {
        setLoading(false);
      }
    };

    void loadSectionData();
  }, [activeSection, authorized, contentFilter, musicQuery, reportsFilter, usersQuery]);

  useEffect(() => {
    if (!selectedUserId || activeSection !== 'users') return;
    void loadUserDetail(selectedUserId);
  }, [activeSection, selectedUserId]);

  const runUserAction = async (action: string, payload: Record<string, unknown> = {}) => {
    if (!selectedUserId) return;

    clearFeedback();
    setBusyAction(action);
    try {
      const data = await withAdminFetch(`/api/admin/users/${selectedUserId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, ...payload }),
      });

      if (action === 'reset_password' && data?.reset_link) {
        setSuccess(`Password reset link generated: ${data.reset_link}`);
      } else {
        setSuccess('User action completed.');
      }

      await loadUsers(usersPagination.page, usersQuery);
      await loadUserDetail(selectedUserId);
      await loadDashboard();
      setAdminNoteDraft('');
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : 'User action failed');
    } finally {
      setBusyAction(null);
    }
  };

  const blockUserFromAdmin = async (userId: string) => {
    clearFeedback();
    setBusyAction(`block:${userId}`);

    try {
      await withAdminFetch('/api/admin/block', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
      setSuccess('User blocked from this admin account.');
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to block user');
    } finally {
      setBusyAction(null);
    }
  };

  const runVerificationAction = async (request: VerificationRequest, status: 'approved' | 'rejected') => {
    clearFeedback();
    setBusyAction(`${status}:${request.id}`);

    try {
      await withAdminFetch('/api/admin/verification', {
        method: 'POST',
        body: JSON.stringify({ request_id: request.id, user_id: request.user_id, status }),
      });
      setSuccess(`Verification request ${status}.`);
      await loadModeration();
      await loadUsers(usersPagination.page, usersQuery);
      await loadDashboard();
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to process request');
    } finally {
      setBusyAction(null);
    }
  };

  const runContentAction = async (postId: string, action: 'delete' | 'hide' | 'restrict' | 'mark_safe') => {
    clearFeedback();
    setBusyAction(`${action}:${postId}`);

    try {
      await withAdminFetch('/api/admin/content', {
        method: 'PATCH',
        body: JSON.stringify({ post_id: postId, action }),
      });
      setSuccess('Content updated.');
      await loadContent();
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : 'Content action failed');
    } finally {
      setBusyAction(null);
    }
  };

  const runReportAction = async (reportId: string, action: 'dismiss' | 'warn_user' | 'remove_content' | 'suspend_user') => {
    clearFeedback();
    setBusyAction(`${action}:${reportId}`);

    try {
      await withAdminFetch('/api/admin/reports', {
        method: 'PATCH',
        body: JSON.stringify({ report_id: reportId, action }),
      });
      setSuccess('Report processed.');
      await loadReports();
      await loadDashboard();
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : 'Report action failed');
    } finally {
      setBusyAction(null);
    }
  };

  const runFeedAction = async (postId: string, action: 'boost' | 'remove_discovery' | 'restore_discovery' | 'override_trending' | 'clear_override') => {
    clearFeedback();
    setBusyAction(`${action}:${postId}`);

    try {
      await withAdminFetch('/api/admin/feed', {
        method: 'PATCH',
        body: JSON.stringify({ post_id: postId, action }),
      });
      setSuccess('Feed control updated.');
      await loadFeed();
      await loadContent();
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : 'Feed action failed');
    } finally {
      setBusyAction(null);
    }
  };

  const pendingVerification = useMemo(
    () => verificationRequests.filter((item) => item.status === 'pending'),
    [verificationRequests]
  );

  if (checkingAccess) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen bg-[#090909] text-white">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-4 md:px-6 md:py-6">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] shadow-[0_20px_80px_rgba(0,0,0,0.5)] backdrop-blur">
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] min-h-[85vh]">
            <aside className="border-b lg:border-b-0 lg:border-r border-white/10 p-4 lg:p-5">
              <div className="mb-5">
                <div className="text-xs tracking-[0.2em] uppercase text-gray-400">Ruehl</div>
                <div className="text-2xl font-black mt-1">Platform Control</div>
              </div>

              <nav className="space-y-1">
                {SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition ${
                      activeSection === section.id
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30'
                        : 'bg-white/[0.02] text-gray-300 border border-transparent hover:bg-white/[0.05]'
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </nav>

              <button
                onClick={() => router.push('/')}
                className="mt-6 w-full px-3 py-2.5 rounded-xl bg-white/10 border border-white/15 text-sm"
              >
                Exit Admin
              </button>
            </aside>

            <main className="p-4 md:p-6 lg:p-7">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight">{SECTIONS.find((item) => item.id === activeSection)?.label}</h1>
                  <p className="text-sm text-gray-400 mt-1">High-trust controls for the Ruehl ecosystem.</p>
                </div>
              </div>

              {success && <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">{success}</div>}
              {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-gray-400">Loading section...</div>
              ) : (
                <>
                  {activeSection === 'dashboard' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                        <Card title="Total users" value={dashboardMetrics.total_users} hint={`${dashboardGrowth.users_growth_7d >= 0 ? '+' : ''}${dashboardGrowth.users_growth_7d}% last 7d`} />
                        <Card title="Active users" value={dashboardMetrics.active_users} hint="Last 30 days" />
                        <Card title="Posts today" value={dashboardMetrics.posts_today} hint={`${dashboardGrowth.posts_growth_7d >= 0 ? '+' : ''}${dashboardGrowth.posts_growth_7d}% last 7d`} />
                        <Card
                          title="Reports pending"
                          value={dashboardMetrics.reports_pending}
                          hint={dashboardMetrics.reports_pending > 0 ? 'Action required' : 'Queue clear'}
                          alert={dashboardMetrics.reports_pending > 0}
                        />
                      </div>
                    </div>
                  )}

                  {activeSection === 'users' && (
                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
                      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                        <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between mb-4">
                          <div>
                            <h2 className="text-lg font-semibold">Users system</h2>
                            <p className="text-sm text-gray-400">Profiles, status, moderation history, and account controls.</p>
                          </div>
                          <div className="flex gap-2 w-full md:w-auto">
                            <input
                              value={usersSearchInput}
                              onChange={(event) => setUsersSearchInput(event.target.value)}
                              placeholder="Search username/email/phone"
                              className="w-full md:w-[260px] rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
                            />
                            <button
                              onClick={() => {
                                setUsersQuery(usersSearchInput.trim());
                                void loadUsers(1, usersSearchInput.trim());
                              }}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-sm font-semibold"
                            >
                              Search
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[860px] text-sm">
                            <thead>
                              <tr className="text-left text-gray-500 border-b border-white/10">
                                <th className="py-2 pr-3 font-medium">User</th>
                                <th className="py-2 pr-3 font-medium">Contact</th>
                                <th className="py-2 pr-3 font-medium">Status</th>
                                <th className="py-2 pr-3 font-medium">Last sign in</th>
                              </tr>
                            </thead>
                            <tbody>
                              {users.map((user) => (
                                <tr
                                  key={user.id}
                                  onClick={() => setSelectedUserId(user.id)}
                                  className={`border-b border-white/5 cursor-pointer transition ${selectedUserId === user.id ? 'bg-cyan-500/10' : 'hover:bg-white/[0.03]'}`}
                                >
                                  <td className="py-3 pr-3">
                                    <div className="font-medium">{user.username || 'No username'}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{user.id}</div>
                                  </td>
                                  <td className="py-3 pr-3 text-gray-300">
                                    <div>{user.email || 'No email'}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{user.phone || 'No phone'}</div>
                                  </td>
                                  <td className="py-3 pr-3">
                                    <div className="flex flex-wrap gap-1.5">
                                      <span className={`px-2 py-1 rounded-full text-[11px] border ${user.is_verified ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-white/20 bg-white/5 text-gray-300'}`}>
                                        {user.is_verified ? 'Verified' : 'Unverified'}
                                      </span>
                                      {user.shadow_banned && <span className="px-2 py-1 rounded-full text-[11px] border border-amber-500/30 bg-amber-500/10 text-amber-300">Shadow banned</span>}
                                      {user.suspended_until && (
                                        <span className="px-2 py-1 rounded-full text-[11px] border border-red-500/30 bg-red-500/10 text-red-300">Suspended</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 pr-3 text-gray-300">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                        {!selectedUserId ? (
                          <div className="text-sm text-gray-400">Select a user to open the detail panel.</div>
                        ) : !selectedUserDetail ? (
                          <div className="text-sm text-gray-400">Loading user detail...</div>
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <div className="text-lg font-bold">{selectedUserDetail.profile?.username || selectedUserDetail.user?.email || 'User'}</div>
                              <div className="text-xs text-gray-500 mt-1">{selectedUserId}</div>
                              <div className="text-sm text-gray-400 mt-2">{selectedUserDetail.profile?.bio || 'No bio provided.'}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() =>
                                  void runUserAction('verify', {
                                    value: !(selectedUserDetail.profile?.is_verified === true),
                                  })
                                }
                                disabled={busyAction !== null}
                                className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-xs"
                              >
                                {selectedUserDetail.profile?.is_verified ? 'Unverify' : 'Verify'}
                              </button>
                              <button
                                onClick={() =>
                                  void runUserAction('shadow_ban', {
                                    value: !(selectedUserDetail.profile?.shadow_banned === true),
                                  })
                                }
                                disabled={busyAction !== null}
                                className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-xs"
                              >
                                {selectedUserDetail.profile?.shadow_banned ? 'Remove Shadow Ban' : 'Shadow Ban'}
                              </button>
                              <button
                                onClick={() => void runUserAction('suspend', { days: suspendDays })}
                                disabled={busyAction !== null}
                                className="px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-200"
                              >
                                Suspend {suspendDays}d
                              </button>
                              <button
                                onClick={() => void runUserAction('suspend', { days: 0 })}
                                disabled={busyAction !== null}
                                className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-xs"
                              >
                                Lift Suspension
                              </button>
                              <button
                                onClick={() => void runUserAction('reset_password')}
                                disabled={busyAction !== null}
                                className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-xs"
                              >
                                Reset Password
                              </button>
                              <button
                                onClick={() => void blockUserFromAdmin(selectedUserId)}
                                disabled={busyAction !== null}
                                className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-xs"
                              >
                                Block User
                              </button>
                              <button
                                onClick={() => {
                                  const confirmDelete = window.prompt('Type DELETE to permanently remove this user');
                                  if (confirmDelete === 'DELETE') {
                                    void runUserAction('delete_user', { confirm: 'DELETE' });
                                  }
                                }}
                                disabled={busyAction !== null}
                                className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-xs text-red-200"
                              >
                                Delete User
                              </button>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
                              <div className="text-xs uppercase tracking-widest text-gray-500">Suspend duration (days)</div>
                              <input
                                type="number"
                                min={1}
                                max={365}
                                value={suspendDays}
                                onChange={(event) => setSuspendDays(Number(event.target.value || 7))}
                                className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-sm"
                              />
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
                              <div className="text-xs uppercase tracking-widest text-gray-500">Admin notes</div>
                              <textarea
                                value={adminNoteDraft}
                                onChange={(event) => setAdminNoteDraft(event.target.value)}
                                rows={3}
                                placeholder="Add internal note"
                                className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-sm resize-none"
                              />
                              <button
                                onClick={() => void runUserAction('add_note', { note: adminNoteDraft })}
                                disabled={busyAction !== null || !adminNoteDraft.trim()}
                                className="w-full px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-sm text-cyan-200 disabled:opacity-50"
                              >
                                Add Note
                              </button>

                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {selectedUserDetail.notes.map((note) => (
                                  <div key={note.id} className="rounded-lg bg-black/60 border border-white/10 px-2.5 py-2 text-xs text-gray-300">
                                    <div>{note.note}</div>
                                    <div className="text-[10px] text-gray-500 mt-1">{new Date(note.created_at).toLocaleString()}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                              <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Activity logs</div>
                              <div className="space-y-1 max-h-28 overflow-y-auto">
                                {selectedUserDetail.activity.map((entry) => (
                                  <div key={entry.id} className="text-xs text-gray-300">
                                    {entry.type} - {entry.created_at ? new Date(entry.created_at).toLocaleString() : 'Unknown'}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                              <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">User posts preview</div>
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {selectedUserDetail.posts.map((post) => (
                                  <div key={post.id} className="text-xs text-gray-300 border border-white/10 rounded-lg p-2">
                                    <div className="line-clamp-2">{post.content || 'Media post'}</div>
                                    <div className="text-[10px] text-gray-500 mt-1">{post.created_at ? new Date(post.created_at).toLocaleString() : 'Unknown'}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                              <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Reports history</div>
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {selectedUserDetail.reports.map((item) => (
                                  <div key={item.id} className="text-xs text-gray-300 border border-white/10 rounded-lg p-2">
                                    <div className="line-clamp-2">{item.reason}</div>
                                    <div className="text-[10px] text-gray-500 mt-1">{new Date(item.created_at).toLocaleString()} - {item.admin_status || 'pending'}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </section>
                    </div>
                  )}

                  {activeSection === 'moderation' && (
                    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                      <h2 className="text-lg font-semibold">Verification moderation queue</h2>
                      {pendingVerification.length === 0 ? (
                        <div className="text-sm text-gray-400">No pending verification requests.</div>
                      ) : (
                        pendingVerification.map((request) => (
                          <div key={request.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                              <div>
                                <div className="font-medium">{request.full_name}</div>
                                <div className="text-xs text-gray-500 mt-1">{new Date(request.created_at).toLocaleString()}</div>
                                <div className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{request.reason}</div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  disabled={busyAction !== null}
                                  onClick={() => void runVerificationAction(request, 'approved')}
                                  className="px-3 py-2 rounded-lg bg-green-500/15 border border-green-500/30 text-sm text-green-200"
                                >
                                  Approve
                                </button>
                                <button
                                  disabled={busyAction !== null}
                                  onClick={() => void runVerificationAction(request, 'rejected')}
                                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </section>
                  )}

                  {activeSection === 'content' && (
                    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {(['all', 'trending', 'reported', 'flagged'] as const).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setContentFilter(filter)}
                            className={`px-3 py-1.5 rounded-full text-xs border ${
                              contentFilter === filter
                                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200'
                                : 'bg-white/5 border-white/15 text-gray-300'
                            }`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-2">
                        {contentItems.map((item) => (
                          <div key={item.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                            <div className="text-xs text-gray-500">{item.id}</div>
                            <div className="text-sm text-gray-200 mt-1 line-clamp-2">{item.content || 'Media post'}</div>
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => void runContentAction(item.id, 'hide')} className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs">Hide</button>
                              <button onClick={() => void runContentAction(item.id, 'restrict')} className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs">Restrict</button>
                              <button onClick={() => void runContentAction(item.id, 'mark_safe')} className="px-2.5 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-xs text-green-200">Mark Safe</button>
                              <button onClick={() => void runContentAction(item.id, 'delete')} className="px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-200">Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {activeSection === 'reports' && (
                    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {(['pending', 'resolved', 'dismissed', 'all'] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => setReportsFilter(status)}
                            className={`px-3 py-1.5 rounded-full text-xs border ${
                              reportsFilter === status
                                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200'
                                : 'bg-white/5 border-white/15 text-gray-300'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>

                      {reports.map((item) => (
                        <div key={item.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                          <div className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString()}</div>
                          <div className="text-sm text-gray-200 mt-1">{item.reason}</div>
                          <div className="text-xs text-gray-400 mt-1">status: {item.admin_status}</div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <button onClick={() => void runReportAction(item.id, 'dismiss')} className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs">Dismiss</button>
                            <button onClick={() => void runReportAction(item.id, 'warn_user')} className="px-2.5 py-1.5 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-xs text-yellow-200">Warn User</button>
                            <button onClick={() => void runReportAction(item.id, 'remove_content')} className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs">Remove Content</button>
                            <button onClick={() => void runReportAction(item.id, 'suspend_user')} className="px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-200">Suspend User</button>
                          </div>
                        </div>
                      ))}
                    </section>
                  )}

                  {activeSection === 'music' && (
                    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <input value={newSoundTrack} onChange={(event) => setNewSoundTrack(event.target.value)} placeholder="Track name" className="rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-sm" />
                        <input value={newSoundArtist} onChange={(event) => setNewSoundArtist(event.target.value)} placeholder="Artist" className="rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-sm" />
                        <input value={newSoundCategory} onChange={(event) => setNewSoundCategory(event.target.value)} placeholder="Category" className="rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-sm" />
                        <button
                          onClick={async () => {
                            clearFeedback();
                            setBusyAction('create-sound');
                            try {
                              await withAdminFetch('/api/admin/music', {
                                method: 'POST',
                                body: JSON.stringify({ track_name: newSoundTrack, artist_name: newSoundArtist, category: newSoundCategory || null }),
                              });
                              setSuccess('Sound uploaded.');
                              setNewSoundTrack('');
                              setNewSoundArtist('');
                              setNewSoundCategory('');
                              await loadMusic();
                            } catch (actionError: unknown) {
                              setError(actionError instanceof Error ? actionError.message : 'Unable to create sound');
                            } finally {
                              setBusyAction(null);
                            }
                          }}
                          disabled={busyAction !== null}
                          className="rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 text-sm"
                        >
                          Upload Sound
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <input
                          value={musicQuery}
                          onChange={(event) => setMusicQuery(event.target.value)}
                          placeholder="Search sounds"
                          className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-sm"
                        />
                        <button onClick={() => void loadMusic()} className="px-4 py-2 rounded-lg bg-white/10 border border-white/15 text-sm">Find</button>
                      </div>

                      <div className="space-y-2">
                        {sounds.map((sound) => (
                          <div key={sound.id} className="rounded-xl border border-white/10 bg-black/30 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div>
                              <div className="font-medium">{sound.track_name} - {sound.artist_name}</div>
                              <div className="text-xs text-gray-500">Usage: {sound.usage_count || 0}</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={async () => {
                                  await withAdminFetch('/api/admin/music', { method: 'PATCH', body: JSON.stringify({ id: sound.id, is_enabled: !(sound.is_enabled === true) }) });
                                  await loadMusic();
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs"
                              >
                                {sound.is_enabled ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                onClick={async () => {
                                  await withAdminFetch('/api/admin/music', { method: 'PATCH', body: JSON.stringify({ id: sound.id, is_trending: !(sound.is_trending === true) }) });
                                  await loadMusic();
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-xs text-cyan-200"
                              >
                                {sound.is_trending ? 'Untrend' : 'Tag Trending'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {activeSection === 'genres' && (
                    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_auto] gap-2">
                        <input value={newGenre} onChange={(event) => setNewGenre(event.target.value)} placeholder="New category" className="rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-sm" />
                        <input type="number" value={newGenreWeight} onChange={(event) => setNewGenreWeight(Number(event.target.value || 100))} className="rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-sm" />
                        <button
                          onClick={async () => {
                            await withAdminFetch('/api/admin/genres', {
                              method: 'POST',
                              body: JSON.stringify({ name: newGenre, priority_weight: newGenreWeight }),
                            });
                            setNewGenre('');
                            setNewGenreWeight(100);
                            await loadGenres();
                          }}
                          className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 text-sm"
                        >
                          Add
                        </button>
                      </div>

                      <div className="space-y-2">
                        {genres.map((genre) => (
                          <div key={genre.id} className="rounded-xl border border-white/10 bg-black/30 p-3 flex items-center justify-between gap-2">
                            <div>
                              <div className="font-medium">{genre.name}</div>
                              <div className="text-xs text-gray-500">Weight: {genre.priority_weight}</div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  const nextWeightRaw = window.prompt('Set new priority weight', String(genre.priority_weight));
                                  if (!nextWeightRaw) return;
                                  const nextWeight = Number(nextWeightRaw);
                                  if (!Number.isFinite(nextWeight)) return;
                                  await withAdminFetch('/api/admin/genres', {
                                    method: 'PATCH',
                                    body: JSON.stringify({ id: genre.id, priority_weight: nextWeight }),
                                  });
                                  await loadGenres();
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs"
                              >
                                Edit Weight
                              </button>
                              <button
                                onClick={async () => {
                                  await withAdminFetch('/api/admin/genres', {
                                    method: 'PATCH',
                                    body: JSON.stringify({ id: genre.id, is_active: !genre.is_active }),
                                  });
                                  await loadGenres();
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs"
                              >
                                {genre.is_active ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                onClick={async () => {
                                  await withAdminFetch(`/api/admin/genres?id=${genre.id}`, { method: 'DELETE' });
                                  await loadGenres();
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-200"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {activeSection === 'feed' && (
                    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                      {feedItems.map((item) => (
                        <div key={item.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                          <div className="text-xs text-gray-500">{item.id}</div>
                          <div className="text-sm text-gray-200 mt-1 line-clamp-2">{item.content || 'Media post'}</div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <button onClick={() => void runFeedAction(item.id, 'boost')} className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-xs text-cyan-200">Boost</button>
                            <button onClick={() => void runFeedAction(item.id, 'remove_discovery')} className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs">Remove Discovery</button>
                            <button onClick={() => void runFeedAction(item.id, 'restore_discovery')} className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs">Restore Discovery</button>
                            <button onClick={() => void runFeedAction(item.id, 'override_trending')} className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs">Override Trending</button>
                            <button onClick={() => void runFeedAction(item.id, 'clear_override')} className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs">Clear Override</button>
                          </div>
                        </div>
                      ))}
                    </section>
                  )}

                  {activeSection === 'support' && (
                    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
                      {supportTickets.length === 0 ? (
                        <div className="text-sm text-gray-400">No support tickets yet.</div>
                      ) : (
                        supportTickets.map((ticket) => (
                          <div key={ticket.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                            <div className="font-medium">{ticket.subject}</div>
                            <div className="text-xs text-gray-500 mt-1">{ticket.status} - {ticket.priority}</div>
                            <div className="text-sm text-gray-300 mt-2">{ticket.message}</div>
                          </div>
                        ))
                      )}
                    </section>
                  )}

                  {activeSection === 'system' && (
                    <section className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                        <Card title="Total users" value={dashboardMetrics.total_users} />
                        <Card title="Active users" value={dashboardMetrics.active_users} />
                        <Card title="Posts today" value={dashboardMetrics.posts_today} />
                        <Card title="Reports pending" value={dashboardMetrics.reports_pending} alert={dashboardMetrics.reports_pending > 0} />
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                        <h2 className="text-lg font-semibold">System snapshot</h2>
                        <div className="mt-3 text-sm text-gray-300 space-y-1">
                          <div>App Version: {process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0'}</div>
                          <div>User Growth (7d): {dashboardGrowth.users_growth_7d >= 0 ? '+' : ''}{dashboardGrowth.users_growth_7d}%</div>
                          <div>Post Growth (7d): {dashboardGrowth.posts_growth_7d >= 0 ? '+' : ''}{dashboardGrowth.posts_growth_7d}%</div>
                        </div>
                      </div>
                    </section>
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
