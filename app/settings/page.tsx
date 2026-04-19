'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Settings = {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  is_private_account: boolean;
  allow_messages_from: 'everyone' | 'followers' | 'none';
  show_activity_status: boolean;
  allow_tagging: boolean;
  two_factor_enabled: boolean;
  is_verified: boolean;
};

type ActivitySummary = {
  liked_posts: Array<{ id: string; post_id: string; created_at: string }>;
  saved_posts: Array<{ id: string; post_id: string; created_at: string }>;
  comments: Array<{ id: string; post_id: string; content: string; created_at: string }>;
  lifted_posts: Array<{ id: string; post_id: string; created_at: string }>;
  matches: Array<{ id: string; status: string; created_at: string }>;
};

type VerificationRequest = {
  id: string;
  full_name: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

type BlockedUserItem = {
  id: string;
  blocked_id: string;
  created_at: string;
  blocked?: { id: string; username: string; avatar_url: string | null } | null;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

async function withAuthFetch(path: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) throw new Error('Missing auth session');

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

export default function SettingsPage() {
  const router = useRouter();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserItem[]>([]);

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationName, setVerificationName] = useState('');
  const [verificationReason, setVerificationReason] = useState('');
  const [blockUserId, setBlockUserId] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [settingsRes, activityRes, verificationRes, blockedRes] = await Promise.all([
        withAuthFetch('/api/settings'),
        withAuthFetch('/api/activity/summary'),
        withAuthFetch('/api/verification-requests'),
        withAuthFetch('/api/blocks'),
      ]);

      setSettings(settingsRes.settings as Settings);
      setActivity(activityRes as ActivitySummary);
      setVerificationRequests((verificationRes.items || []) as VerificationRequest[]);
      setBlockedUsers((blockedRes.items || []) as BlockedUserItem[]);

      setUsername(settingsRes.settings.username || '');
      setBio(settingsRes.settings.bio || '');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load settings'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateAccount = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await withAuthFetch('/api/account', {
        method: 'PATCH',
        body: JSON.stringify({
          username,
          bio,
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(password.trim() ? { password } : {}),
        }),
      });

      setEmail('');
      setPassword('');
      setSuccess('Account settings updated.');
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update account'));
    } finally {
      setSaving(false);
    }
  };

  const updatePrivacy = async (patch: Partial<Settings>) => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const next = {
        is_private_account: settings.is_private_account,
        allow_messages_from: settings.allow_messages_from,
        show_activity_status: settings.show_activity_status,
        allow_tagging: settings.allow_tagging,
        two_factor_enabled: settings.two_factor_enabled,
        ...patch,
      };

      const res = await withAuthFetch('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(next),
      });

      setSettings(res.settings as Settings);
      setSuccess('Settings updated.');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update settings'));
    } finally {
      setSaving(false);
    }
  };

  const submitVerification = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await withAuthFetch('/api/verification-requests', {
        method: 'POST',
        body: JSON.stringify({
          full_name: verificationName,
          reason: verificationReason,
          social_links: {},
        }),
      });

      setVerificationName('');
      setVerificationReason('');
      setSuccess('Verification request submitted.');
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to submit verification request'));
    } finally {
      setSaving(false);
    }
  };

  const blockUser = async () => {
    if (!blockUserId.trim()) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await withAuthFetch('/api/blocks', {
        method: 'POST',
        body: JSON.stringify({ blocked_id: blockUserId.trim() }),
      });

      setBlockUserId('');
      setSuccess('User blocked.');
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to block user'));
    } finally {
      setSaving(false);
    }
  };

  const unblockUser = async (blockedId: string) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await withAuthFetch(`/api/blocks?blocked_id=${encodeURIComponent(blockedId)}`, {
        method: 'DELETE',
      });
      setSuccess('User unblocked.');
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to unblock user'));
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;

      localStorage.removeItem('user_id');
      localStorage.removeItem('ruehl:avatar-url');
      localStorage.removeItem('optimistic_post');
      sessionStorage.removeItem('ruehl:pending-verification');
      sessionStorage.removeItem('ruehl:pending-verification-last-sent');

      setShowLogoutConfirm(false);
      router.replace('/login');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to sign out'));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-[720px] px-4 pb-28 pt-6 space-y-8">
        <div>
          <h1 className="text-3xl font-black">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Control your account, privacy, and security.</p>
        </div>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
        {success && <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">{success}</div>}

        <section className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-4 space-y-3">
          <h2 className="text-lg font-bold">Account</h2>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-sm" />
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" rows={3} className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-sm resize-none" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="New email (optional)" className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-sm" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (optional)" type="password" className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-sm" />
          <button disabled={saving} onClick={updateAccount} className="w-full h-11 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-semibold disabled:opacity-50">Save account changes</button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-4 space-y-3">
          <h2 className="text-lg font-bold">Privacy</h2>
          <button onClick={() => updatePrivacy({ is_private_account: !settings?.is_private_account })} className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-left text-sm">
            Private account: <span className="text-green-400">{settings?.is_private_account ? 'On' : 'Off'}</span>
          </button>
          <button onClick={() => updatePrivacy({ show_activity_status: !settings?.show_activity_status })} className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-left text-sm">
            Show activity status: <span className="text-green-400">{settings?.show_activity_status ? 'On' : 'Off'}</span>
          </button>
          <button onClick={() => updatePrivacy({ allow_tagging: !settings?.allow_tagging })} className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-left text-sm">
            Allow tagging: <span className="text-green-400">{settings?.allow_tagging ? 'On' : 'Off'}</span>
          </button>
          <div className="rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-sm">
            <div className="mb-2">Allow messages from</div>
            <div className="flex gap-2">
              {(['everyone', 'followers', 'none'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => updatePrivacy({ allow_messages_from: value })}
                  className={`px-3 py-1.5 rounded-full text-xs border ${
                    settings?.allow_messages_from === value
                      ? 'bg-green-500/20 border-green-400/50 text-green-300'
                      : 'bg-white/5 border-white/15 text-gray-300'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-4 space-y-3">
          <h2 className="text-lg font-bold">Activity</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-black/60 border border-white/10 p-3">
              <div className="text-xs text-gray-500">Liked posts</div>
              <div className="text-xl font-bold mt-1">{activity?.liked_posts.length || 0}</div>
            </div>
            <div className="rounded-lg bg-black/60 border border-white/10 p-3">
              <div className="text-xs text-gray-500">Saved posts</div>
              <div className="text-xl font-bold mt-1">{activity?.saved_posts.length || 0}</div>
            </div>
            <div className="rounded-lg bg-black/60 border border-white/10 p-3">
              <div className="text-xs text-gray-500">Comments</div>
              <div className="text-xl font-bold mt-1">{activity?.comments.length || 0}</div>
            </div>
            <div className="rounded-lg bg-black/60 border border-white/10 p-3">
              <div className="text-xs text-gray-500">Lifted</div>
              <div className="text-xl font-bold mt-1">{activity?.lifted_posts.length || 0}</div>
            </div>
            <div className="rounded-lg bg-black/60 border border-white/10 p-3">
              <div className="text-xs text-gray-500">Matches</div>
              <div className="text-xl font-bold mt-1">{activity?.matches.length || 0}</div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-wide text-gray-500">Recent comments</h3>
            {(activity?.comments || []).slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-xs text-gray-300">
                {item.content}
              </div>
            ))}
            {(!activity?.comments || activity.comments.length === 0) && (
              <div className="text-xs text-gray-600">No comments yet.</div>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-wide text-gray-500">Recent likes, lifts and saves</h3>
            <div className="text-xs text-gray-300">Likes: {(activity?.liked_posts || []).slice(0, 5).map((i) => i.post_id.slice(0, 8)).join(', ') || 'none'}</div>
            <div className="text-xs text-gray-300">Lifts: {(activity?.lifted_posts || []).slice(0, 5).map((i) => i.post_id.slice(0, 8)).join(', ') || 'none'}</div>
            <div className="text-xs text-gray-300">Saves: {(activity?.saved_posts || []).slice(0, 5).map((i) => i.post_id.slice(0, 8)).join(', ') || 'none'}</div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-4 space-y-3">
          <h2 className="text-lg font-bold">Security</h2>
          <button onClick={() => updatePrivacy({ two_factor_enabled: !settings?.two_factor_enabled })} className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-left text-sm">
            Two-factor authentication: <span className="text-green-400">{settings?.two_factor_enabled ? 'Enabled' : 'Disabled'}</span>
          </button>
          <p className="text-xs text-gray-500">When enabled, your login flow should require OTP verification via your auth provider.</p>
          <div className="rounded-lg bg-black/60 border border-white/10 p-3 space-y-2">
            <h3 className="text-sm font-semibold">Blocked users</h3>
            <div className="flex gap-2">
              <input
                value={blockUserId}
                onChange={(e) => setBlockUserId(e.target.value)}
                placeholder="User ID to block"
                className="flex-1 rounded-lg bg-black/70 border border-white/10 px-3 py-2 text-sm"
              />
              <button
                disabled={saving}
                onClick={blockUser}
                className="px-3 rounded-lg bg-red-500/20 border border-red-400/30 text-red-300 text-sm disabled:opacity-50"
              >
                Block
              </button>
            </div>
            <div className="space-y-2">
              {blockedUsers.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-black/70 border border-white/10 px-3 py-2 text-xs">
                  <span className="text-gray-300">{item.blocked?.username || item.blocked_id}</span>
                  <button onClick={() => unblockUser(item.blocked_id)} className="text-red-300 hover:text-red-200">
                    Unblock
                  </button>
                </div>
              ))}
              {blockedUsers.length === 0 && <div className="text-xs text-gray-600">No blocked users.</div>}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-4 space-y-3">
          <h2 className="text-lg font-bold">Verification</h2>
          <div className="text-sm text-gray-400">Current status: {settings?.is_verified ? 'Verified' : 'Not verified'}</div>
          <input value={verificationName} onChange={(e) => setVerificationName(e.target.value)} placeholder="Full name" className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-sm" />
          <textarea value={verificationReason} onChange={(e) => setVerificationReason(e.target.value)} placeholder="Reason for verification" rows={3} className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-sm resize-none" />
          <button disabled={saving} onClick={submitVerification} className="w-full h-11 rounded-full bg-white/10 border border-white/20 text-sm font-semibold disabled:opacity-50">Submit verification request</button>
          {verificationRequests.length > 0 && (
            <div className="space-y-2">
              {verificationRequests.slice(0, 3).map((request) => (
                <div key={request.id} className="rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-xs text-gray-300">
                  {new Date(request.created_at).toLocaleDateString()} - {request.status}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0E0E0E] p-4 space-y-2">
          <h2 className="text-lg font-bold">About</h2>
          <p className="text-sm text-gray-400">Terms of Service</p>
          <p className="text-sm text-gray-400">Privacy Policy</p>
          <p className="text-sm text-gray-400">App version: {process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0'}</p>
          <p className="text-sm text-gray-400">Support: support@ruehl.app</p>
        </section>

        <section className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4 space-y-3">
          <h2 className="text-lg font-bold text-red-200">Session</h2>
          <p className="text-sm text-red-100/70">Log out of your account on this device and return to the sign in page.</p>
          <button
            disabled={saving}
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full h-11 rounded-full bg-red-500/20 border border-red-400/30 text-sm font-semibold text-red-200 disabled:opacity-50"
          >
            Log out
          </button>
        </section>

        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-8 pt-20 sm:items-center">
            <div className="w-full max-w-[430px] rounded-3xl border border-white/10 bg-[#121212] p-5 shadow-2xl">
              <h2 className="text-xl font-bold text-white">Confirm logout</h2>
              <p className="mt-2 text-sm text-gray-400">
                You will be signed out of this device and sent back to the sign in page.
              </p>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 h-11 rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={logout}
                  className="flex-1 h-11 rounded-full border border-red-400/30 bg-red-500/20 text-sm font-semibold text-red-200 disabled:opacity-50"
                >
                  {saving ? 'Logging out...' : 'Confirm logout'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}