'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Overview = {
  total_users: number;
  total_posts: number;
  active_users: number;
};

type AdminUser = {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string | null;
  last_sign_in_at: string | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type VerificationRequest = {
  id: string;
  user_id: string;
  full_name: string;
  reason: string;
  social_links: Record<string, string> | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

type ConfirmState =
  | { kind: 'reset'; user: AdminUser }
  | { kind: 'delete'; user: AdminUser }
  | { kind: 'block'; user: AdminUser }
  | null;

async function withAdminFetch(path: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error('Missing auth session');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error || 'Request failed');
  }

  return json;
}

export default function AdminPage() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [overview, setOverview] = useState<Overview>({ total_users: 0, total_posts: 0, active_users: 0 });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [loadingVerification, setLoadingVerification] = useState(false);

  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [confirmText, setConfirmText] = useState('');
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

  const loadUsers = async (page = pagination.page, nextQuery = query) => {
    setLoadingUsers(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pagination.pageSize),
      });

      if (nextQuery.trim()) params.set('query', nextQuery.trim());

      const json = await withAdminFetch(`/api/admin/users?${params.toString()}`);
      setOverview(json.overview as Overview);
      setUsers((json.items || []) as AdminUser[]);
      setPagination(json.pagination as Pagination);
    } catch (loadError: unknown) {
      if (loadError instanceof Error) {
        setError(loadError.message || 'Unable to load admin users');
      } else {
        setError('Unable to load admin users');
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadVerification = async () => {
    setLoadingVerification(true);
    setError(null);

    try {
      const json = await withAdminFetch('/api/admin/verification');
      setVerificationRequests((json.items || []) as VerificationRequest[]);
    } catch (loadError: unknown) {
      if (loadError instanceof Error) {
        setError(loadError.message || 'Unable to load verification requests');
      } else {
        setError('Unable to load verification requests');
      }
    } finally {
      setLoadingVerification(false);
    }
  };

  useEffect(() => {
    if (!authorized) return;
    void loadUsers(1, query);
    void loadVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized, query]);

  const pendingVerification = useMemo(
    () => verificationRequests.filter((request) => request.status === 'pending'),
    [verificationRequests]
  );

  const clearFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const runUserAction = async () => {
    if (!confirmState) return;

    clearFeedback();
    setBusyAction(confirmState.kind);

    try {
      if (confirmState.kind === 'reset') {
        await withAdminFetch('/api/admin/reset', {
          method: 'POST',
          body: JSON.stringify({ user_id: confirmState.user.id }),
        });
        setSuccess(`Reset ${confirmState.user.username || confirmState.user.email || 'user'}.`);
      }

      if (confirmState.kind === 'block') {
        await withAdminFetch('/api/admin/block', {
          method: 'POST',
          body: JSON.stringify({ user_id: confirmState.user.id }),
        });
        setSuccess(`Blocked ${confirmState.user.username || confirmState.user.email || 'user'}.`);
      }

      if (confirmState.kind === 'delete') {
        await withAdminFetch('/api/admin/delete', {
          method: 'POST',
          body: JSON.stringify({ user_id: confirmState.user.id, confirm: 'DELETE' }),
        });
        setSuccess(`Deleted ${confirmState.user.username || confirmState.user.email || 'user'}.`);
      }

      setConfirmState(null);
      setConfirmText('');
      await loadUsers(pagination.page, query);
      await loadVerification();
    } catch (actionError: unknown) {
      if (actionError instanceof Error) {
        setError(actionError.message || 'Admin action failed');
      } else {
        setError('Admin action failed');
      }
    } finally {
      setBusyAction(null);
    }
  };

  const updateVerification = async (request: VerificationRequest, status: 'approved' | 'rejected') => {
    clearFeedback();
    setBusyAction(`${status}:${request.id}`);

    try {
      await withAdminFetch('/api/admin/verification', {
        method: 'POST',
        body: JSON.stringify({
          request_id: request.id,
          user_id: request.user_id,
          status,
        }),
      });

      setSuccess(`Verification request ${status}.`);
      await loadUsers(pagination.page, query);
      await loadVerification();
    } catch (verificationError: unknown) {
      if (verificationError instanceof Error) {
        setError(verificationError.message || 'Unable to update verification request');
      } else {
        setError('Unable to update verification request');
      }
    } finally {
      setBusyAction(null);
    }
  };

  if (checkingAccess) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <div className="min-h-screen bg-black text-white flex justify-center">
      <div className="w-full max-w-[1180px] px-5 py-8 md:px-8 md:py-10">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Admin Control Panel</h1>
            <p className="text-sm text-gray-400 mt-1">Platform safety, moderation, and verification controls.</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-sm"
          >
            Exit
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-widest text-gray-500">Total Users</div>
            <div className="text-3xl font-black mt-2">{overview.total_users}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-widest text-gray-500">Total Posts</div>
            <div className="text-3xl font-black mt-2">{overview.total_posts}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-widest text-gray-500">Active Users</div>
            <div className="text-3xl font-black mt-2">{overview.active_users}</div>
          </div>
        </div>

        {success && (
          <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold">Users</h2>
              <p className="text-sm text-gray-400">Search, inspect, reset, block, or delete accounts.</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search username, email, or phone"
                className="w-full md:w-[320px] rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
              />
              <button
                onClick={() => {
                  setPagination((prev) => ({ ...prev, page: 1 }));
                  setQuery(searchInput.trim());
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-semibold"
              >
                Search
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-white/10">
                  <th className="py-3 pr-3 font-medium">User</th>
                  <th className="py-3 pr-3 font-medium">Email / Phone</th>
                  <th className="py-3 pr-3 font-medium">Verified</th>
                  <th className="py-3 pr-3 font-medium">Created</th>
                  <th className="py-3 pr-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">Loading users...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">No users found.</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 align-top">
                      <td className="py-4 pr-3">
                        <div className="font-medium">{user.username || 'No username'}</div>
                        <div className="text-xs text-gray-500 mt-1">{user.id}</div>
                      </td>
                      <td className="py-4 pr-3 text-gray-300">
                        <div>{user.email || 'No email'}</div>
                        <div className="text-xs text-gray-500 mt-1">{user.phone || 'No phone'}</div>
                      </td>
                      <td className="py-4 pr-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs border ${user.is_verified ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-white/15 bg-white/5 text-gray-300'}`}>
                          {user.is_verified ? 'Verified' : 'Not verified'}
                        </span>
                      </td>
                      <td className="py-4 pr-3 text-gray-300">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="py-4 pr-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setConfirmState({ kind: 'reset', user })}
                            className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs"
                          >
                            Reset Account
                          </button>
                          <button
                            onClick={() => setConfirmState({ kind: 'delete', user })}
                            className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-200"
                          >
                            Delete User
                          </button>
                          <button
                            onClick={() => setConfirmState({ kind: 'block', user })}
                            className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs"
                          >
                            Block User
                          </button>
                          <button
                            onClick={() => router.push(`/profile/${user.username || user.id}`)}
                            className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs"
                          >
                            View Profile
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
            <div>
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1 || loadingUsers}
                onClick={() => void loadUsers(pagination.page - 1, query)}
                className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages || loadingUsers}
                onClick={() => void loadUsers(pagination.page + 1, query)}
                className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Verification Requests</h2>
            <p className="text-sm text-gray-400">Approve or reject platform verification requests.</p>
          </div>

          {loadingVerification ? (
            <div className="py-6 text-sm text-gray-400">Loading requests...</div>
          ) : pendingVerification.length === 0 ? (
            <div className="py-6 text-sm text-gray-400">No pending verification requests.</div>
          ) : (
            <div className="space-y-3">
              {pendingVerification.map((request) => (
                <div key={request.id} className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{request.full_name}</div>
                      <div className="text-xs text-gray-500 mt-1">{new Date(request.created_at).toLocaleString()}</div>
                      <p className="text-sm text-gray-300 mt-3 whitespace-pre-wrap">{request.reason}</p>
                      {request.social_links && Object.keys(request.social_links).length > 0 && (
                        <div className="mt-3 text-xs text-gray-400 space-y-1">
                          {Object.entries(request.social_links).map(([label, value]) => (
                            <div key={label}>{label}: {value}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        disabled={busyAction === `approved:${request.id}` || busyAction === `rejected:${request.id}`}
                        onClick={() => void updateVerification(request, 'approved')}
                        className="px-3 py-2 rounded-lg bg-green-500/15 border border-green-500/30 text-sm text-green-200 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        disabled={busyAction === `approved:${request.id}` || busyAction === `rejected:${request.id}`}
                        onClick={() => void updateVerification(request, 'rejected')}
                        className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {confirmState && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#111] p-5">
              <h3 className="text-lg font-semibold mb-2">
                {confirmState.kind === 'reset' ? 'Reset account' : confirmState.kind === 'block' ? 'Block user' : 'Delete user'}
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                {confirmState.kind === 'reset' && 'This will clear the user content and reset profile fields.'}
                {confirmState.kind === 'block' && 'This will block the user from the current admin account using the existing block system.'}
                {confirmState.kind === 'delete' && 'This permanently deletes the account. This cannot be undone.'}
              </p>

              {confirmState.kind === 'delete' && (
                <div className="mb-4">
                  <label className="text-xs uppercase tracking-widest text-gray-500">Type DELETE to confirm</label>
                  <input
                    value={confirmText}
                    onChange={(event) => setConfirmText(event.target.value)}
                    className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setConfirmState(null);
                    setConfirmText('');
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={busyAction !== null || (confirmState.kind === 'delete' && confirmText !== 'DELETE')}
                  onClick={() => void runUserAction()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-semibold disabled:opacity-50"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
