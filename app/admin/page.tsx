'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminCard from '@/components/admin/AdminCard';
import RequestModal from '@/components/admin/RequestModal';
import type { AdminPermission, AdminRole } from '@/lib/adminRoles';
import type { GovernedRequestSubject } from '@/lib/admin/executeRequest';
import AccountTypeChip from '@/components/profile/AccountTypeChip';
import VerificationBadge from '@/components/profile/VerificationBadge';
import type { VerificationSubmission } from '@/lib/ruehl/verification';
import type { AccountCategory, AccountType, BadgeVerificationStatus } from '@/lib/ruehl/accountTypes';
import { ACCOUNT_TYPE_LABELS, getCategoryLabel, getTypeLabel } from '@/lib/ruehl/accountTypes';

type SectionId =
  | 'dashboard'
  | 'charts_analytics'
  | 'users'
  | 'content'
  | 'moderation'
  | 'reports'
  | 'music'
  | 'genres'
  | 'feed'
  | 'support'
  | 'system'
  | 'access_control'
  | 'requests'
  | 'sounds_intelligence'
  | 'posts_intelligence'
  | 'scoring_debug'
  | 'activity_monitor';

type RequestSubject = GovernedRequestSubject;

type GenericItem = Record<string, unknown>;

type AccessPayload = {
  current: {
    id: string;
    role: AdminRole;
    permissions: AdminPermission[];
    is_root_admin: boolean;
  };
  items: Array<{
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    employee_id: string | null;
    role: AdminRole;
    is_root_admin: boolean;
    created_at: string;
  }>;
  available_roles: AdminRole[];
};

type RequestRow = {
  id: string;
  subject: RequestSubject;
  target_id?: string | null;
  target: string;
  notes: string | null;
  attachment_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
};

type RequestsPayload = {
  current_role: AdminRole;
  can_review: boolean;
  items: RequestRow[];
};

const SECTIONS: Array<{ id: SectionId; label: string; description: string }> = [
  { id: 'dashboard', label: 'Dashboard', description: 'Institutional KPI and governance overview.' },
  { id: 'charts_analytics', label: 'Charts Analytics', description: 'Internal chart intelligence only.' },
  { id: 'users', label: 'Users', description: 'User directory and account intelligence.' },
  { id: 'content', label: 'Content', description: 'Content signals and risk overview.' },
  { id: 'moderation', label: 'Moderation', description: 'Verification and moderation queue.' },
  { id: 'reports', label: 'Reports', description: 'Incident pipeline and outcomes.' },
  { id: 'music', label: 'Music', description: 'Sound catalog health.' },
  { id: 'genres', label: 'Fitness / Genres', description: 'Taxonomy management.' },
  { id: 'feed', label: 'Feed Control', description: 'Request-based governance only.' },
  { id: 'support', label: 'Support', description: 'Support ticket operations.' },
  { id: 'system', label: 'System', description: 'System health and policy mode.' },
  { id: 'access_control', label: 'Access Control', description: 'Roles and permission governance.' },
  { id: 'requests', label: 'Requests', description: 'All sensitive actions route through approval.' },
  { id: 'sounds_intelligence', label: 'Sounds Intelligence', description: 'Sound-level intelligence table.' },
  { id: 'posts_intelligence', label: 'Posts Intelligence', description: 'Post-level contribution intelligence.' },
  { id: 'scoring_debug', label: 'Scoring Debug', description: 'Score component transparency.' },
  { id: 'activity_monitor', label: 'Activity Monitor', description: 'Realtime monitoring and anomaly alerts.' },
];

const SUBJECTS: RequestSubject[] = [
  'VERIFY_USER',
  'SHADOW_BAN_USER',
  'RESTRICT_USER',
  'DELETE_USER',
  'CHANGE_USERNAME',
  'CHANGE_EMAIL',
  'CHANGE_SECURITY_SETTINGS',
  'ADD_GENRE',
  'REMOVE_GENRE',
  'MODIFY_GENRE',
  'OVERRIDE_CHART',
  'REMOVE_DISCOVERY',
  'BOOST_PROMOTE_CONTENT',
  'DELETE_CONTENT',
  'MODIFY_MUSIC_METADATA',
  'SECURITY_CHANGE',
  'OTHER',
];

const TARGET_FIELD_CONFIG: Record<
  RequestSubject,
  { placeholder: string; helper: string; notesPlaceholder: string }
> = {
  VERIFY_USER: {
    placeholder: 'User UUID or username (example: @ruehluser)',
    helper: 'Use the profile username or UUID of the account to verify.',
    notesPlaceholder: 'Optional reason/context for verification',
  },
  SHADOW_BAN_USER: {
    placeholder: 'User UUID or username (example: @ruehluser)',
    helper: 'Use the account username or UUID to shadow ban after approval.',
    notesPlaceholder: 'Reason and evidence summary',
  },
  RESTRICT_USER: {
    placeholder: 'User UUID or username (example: @ruehluser)',
    helper: 'Use the account username or UUID for temporary restriction requests.',
    notesPlaceholder: 'Reason, duration, and policy reference',
  },
  DELETE_USER: {
    placeholder: 'User UUID or username (example: @ruehluser)',
    helper: 'Use the account username or UUID that should be removed.',
    notesPlaceholder: 'Deletion justification and evidence',
  },
  CHANGE_USERNAME: {
    placeholder: 'User UUID or current username',
    helper: 'Target is who to change. Put the new username in Notes.',
    notesPlaceholder: 'New username (required)',
  },
  CHANGE_EMAIL: {
    placeholder: 'User UUID or username',
    helper: 'Target is who to change. Put the new email in Notes.',
    notesPlaceholder: 'New email address (required)',
  },
  CHANGE_SECURITY_SETTINGS: {
    placeholder: 'User UUID or username',
    helper: 'Target the account and describe requested security change in Notes.',
    notesPlaceholder: 'Requested security change details',
  },
  ADD_GENRE: {
    placeholder: 'Genre name to add',
    helper: 'Enter the new genre name as target.',
    notesPlaceholder: 'Optional rationale or default weight',
  },
  REMOVE_GENRE: {
    placeholder: 'Genre name to remove',
    helper: 'Enter the existing genre name as target.',
    notesPlaceholder: 'Optional rationale',
  },
  MODIFY_GENRE: {
    placeholder: 'Genre name to modify',
    helper: 'Target is genre name. Put new weight/value in Notes.',
    notesPlaceholder: 'New weight/value (required)',
  },
  OVERRIDE_CHART: {
    placeholder: 'Chart key or GLOBAL_CHARTS',
    helper: 'Use GLOBAL_CHARTS or specific chart identifier.',
    notesPlaceholder: 'Override rationale and expected outcome',
  },
  REMOVE_DISCOVERY: {
    placeholder: 'Post UUID',
    helper: 'Target is the post id to remove from discovery.',
    notesPlaceholder: 'Policy reason and evidence',
  },
  BOOST_PROMOTE_CONTENT: {
    placeholder: 'Post UUID',
    helper: 'Target is the post id to boost/promote.',
    notesPlaceholder: 'Promotion duration and justification',
  },
  DELETE_CONTENT: {
    placeholder: 'Post UUID',
    helper: 'Target is the post id to permanently remove.',
    notesPlaceholder: 'Deletion reason and violation context',
  },
  MODIFY_MUSIC_METADATA: {
    placeholder: 'Sound UUID',
    helper: 'Target is the sound id. Include metadata diff in notes.',
    notesPlaceholder: 'Requested metadata changes',
  },
  SECURITY_CHANGE: {
    placeholder: 'User UUID',
    helper: 'Target account for security updates.',
    notesPlaceholder: 'Requested security change details',
  },
  OTHER: {
    placeholder: 'Reference id, username, or object key',
    helper: 'Use the clearest identifier available for review.',
    notesPlaceholder: 'Full request details',
  },
};

async function withAdminFetch(path: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Missing auth session');

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.get('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(path, { ...options, headers });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((json as { error?: string }).error || 'Request failed');
  return json;
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: Array<Array<string | number | null | undefined>> }) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-gray-400">
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap px-3 py-2 font-medium">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-white/5">
              {row.map((value, colIndex) => (
                <td key={`${rowIndex}-${colIndex}`} className="whitespace-nowrap px-3 py-2 text-gray-200">{value ?? '-'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type InlineOption<T extends string> = {
  value: T;
  label: string;
};

type VerificationQueueRow = VerificationSubmission & {
  username: string | null;
  profileBadgeVerificationStatus: string | null;
};

function parseAccountType(raw: unknown): AccountType | null {
  const v = String(raw || '').toLowerCase();
  if (v === 'personal' || v === 'business' || v === 'media') return v;
  return null;
}

function parseBadgeStatus(raw: unknown): BadgeVerificationStatus {
  const v = String(raw || '').toLowerCase();
  if (v === 'pending' || v === 'approved' || v === 'rejected') return v;
  return null;
}

function InlineSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: InlineOption<T>[];
  onChange: (nextValue: T) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div ref={containerRef} className="space-y-2">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-left"
      >
        <span>{selectedOption?.label || value}</span>
        <span className="text-xs text-gray-400">{open ? '^' : 'v'}</span>
      </button>
      {open && (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-black/70 p-1">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm transition ${
                option.value === value ? 'bg-cyan-500/20 text-cyan-200' : 'text-gray-200 hover:bg-white/10'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');
  const [access, setAccess] = useState<AccessPayload | null>(null);
  const [dashboard, setDashboard] = useState<GenericItem>({});
  const [charts, setCharts] = useState<GenericItem>({});
  const [listData, setListData] = useState<GenericItem[]>([]);
  const [requests, setRequests] = useState<RequestsPayload | null>(null);

  const [usersAccountTypeFilter, setUsersAccountTypeFilter] = useState<'all' | AccountType>('all');
  const [usersBadgeFilter, setUsersBadgeFilter] = useState<'all' | 'none' | NonNullable<BadgeVerificationStatus>>('all');
  const [rejectDraftById, setRejectDraftById] = useState<Record<string, string>>({});

  const [roleTargetId, setRoleTargetId] = useState('');
  const [roleValue, setRoleValue] = useState<AdminRole>('ANALYST');
  const [createAdminForm, setCreateAdminForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'ANALYST' as AdminRole,
  });
  const [requestForm, setRequestForm] = useState({
    subject: 'OTHER' as RequestSubject,
    target: '',
    notes: '',
    attachment_url: '',
  });
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestModalSubject, setRequestModalSubject] = useState<RequestSubject>('OTHER');
  const [requestModalTarget, setRequestModalTarget] = useState('');

  const permissions = useMemo(() => new Set(access?.current.permissions || []), [access]);
  const role = access?.current.role || 'MODERATOR';
  const has = useCallback((permission: AdminPermission) => permissions.has(permission), [permissions]);
  const targetFieldConfig = TARGET_FIELD_CONFIG[requestForm.subject];
  const isRootAdmin = Boolean(access?.current.is_root_admin);

  const assignableRoleOptions = useMemo(() => {
    const roles = (access?.available_roles || ['SUPER_ADMIN', 'ADMIN', 'ANALYST', 'MODERATOR']) as AdminRole[];
    const visibleRoles = isRootAdmin ? roles : roles.filter((item) => item !== 'SUPER_ADMIN');
    return visibleRoles.map((item) => ({ value: item, label: item }));
  }, [access, isRootAdmin]);

  const requestSubjectOptions = useMemo(
    () => SUBJECTS.map((subject) => ({ value: subject, label: subject })),
    []
  );

  const roleTargetOptions = useMemo(
    () =>
      (access?.items || [])
        .filter((item) => !item.is_root_admin)
        .map((item) => ({
          value: item.id,
          label: `${item.employee_id || 'RUEHL-EMP-UNSET'} - ${item.email || item.id}`,
        })),
    [access]
  );

  useEffect(() => {
    if (!roleTargetOptions.length) {
      setRoleTargetId('');
      return;
    }

    if (!roleTargetOptions.some((item) => item.value === roleTargetId)) {
      setRoleTargetId(roleTargetOptions[0].value);
    }
  }, [roleTargetId, roleTargetOptions]);

  useEffect(() => {
    if (!assignableRoleOptions.some((item) => item.value === roleValue)) {
      setRoleValue(assignableRoleOptions[0]?.value || 'ANALYST');
    }
  }, [assignableRoleOptions, roleValue]);

  const loadAccess = useCallback(async () => {
    const data = (await withAdminFetch('/api/admin/access-control')) as AccessPayload;
    setAccess(data);
  }, []);

  const loadRequests = useCallback(async () => {
    const data = (await withAdminFetch('/api/admin/requests?status=pending')) as RequestsPayload;
    setRequests(data);
  }, []);

  const loadSection = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (activeSection === 'dashboard') {
        setDashboard((await withAdminFetch('/api/admin/dashboard')) as GenericItem);
      } else if (activeSection === 'charts_analytics') {
        setCharts((await withAdminFetch('/api/admin/charts-analytics')) as GenericItem);
      } else if (activeSection === 'access_control') {
        await loadAccess();
      } else if (activeSection === 'requests') {
        await loadRequests();
      } else if (activeSection === 'sounds_intelligence') {
        const data = await withAdminFetch('/api/admin/intelligence/sounds');
        setListData((data.items || []) as GenericItem[]);
      } else if (activeSection === 'posts_intelligence') {
        const data = await withAdminFetch('/api/admin/intelligence/posts');
        setListData((data.items || []) as GenericItem[]);
      } else if (activeSection === 'scoring_debug') {
        const data = await withAdminFetch('/api/admin/intelligence/scoring');
        setListData((data.items || []) as GenericItem[]);
      } else if (activeSection === 'activity_monitor') {
        const data = await withAdminFetch('/api/admin/intelligence/activity');
        setDashboard(data as GenericItem);
      } else {
        const usersQs = new URLSearchParams({ page: '1', pageSize: '25' });
        if (usersAccountTypeFilter !== 'all') usersQs.set('accountType', usersAccountTypeFilter);
        if (usersBadgeFilter !== 'all') usersQs.set('badgeVerification', usersBadgeFilter);

        const endpointBySection: Record<string, string> = {
          users: `/api/admin/users?${usersQs.toString()}`,
          content: '/api/admin/content?filter=all&sort=recent&page=1&pageSize=25',
          moderation: '/api/admin/verification?status=pending',
          reports: '/api/admin/reports?status=all',
          music: '/api/admin/music',
          genres: '/api/admin/genres',
          feed: '/api/admin/feed',
          support: '/api/admin/support',
          system: '/api/admin/dashboard',
        };

        const endpoint = endpointBySection[activeSection] || '/api/admin/dashboard';
        const data = await withAdminFetch(endpoint);
        setListData(((data.items || data.top_sounds || []) as GenericItem[]).slice(0, 200));
      }
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [activeSection, loadAccess, loadRequests, usersAccountTypeFilter, usersBadgeFilter]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;

      const authUser = session?.user ?? null;
      if (!authUser) {
        router.replace('/admin/login');
        return;
      }

      const [{ data: adminInstitutional }, { data: platformRow }] = await Promise.all([
        supabase.from('admin_users').select('id').eq('id', authUser.id).maybeSingle(),
        supabase.from('users').select('is_admin').eq('id', authUser.id).maybeSingle(),
      ]);
      if (!mounted) return;

      const isPlatformAdmin = Boolean((platformRow as { is_admin?: boolean } | null)?.is_admin);
      if (!adminInstitutional?.id && !isPlatformAdmin) {
        router.replace('/');
        return;
      }

      setAuthorized(true);
      setChecking(false);

      try {
        await loadAccess();
      } catch {
        setError('Request failed');
      }
    };

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [loadAccess, router]);

  useEffect(() => {
    if (!authorized) return;
    void loadSection();
  }, [authorized, loadSection]);

  useEffect(() => {
    const section = searchParams.get('section');
    if (!section) return;

    const isKnownSection = SECTIONS.some((item) => item.id === section);
    if (!isKnownSection) return;

    setActiveSection(section as SectionId);
  }, [searchParams]);

  useEffect(() => {
    if (!success) return;

    const timer = window.setTimeout(() => {
      setSuccess(null);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    setSuccess(null);
  }, [activeSection]);

  const submitRequestPayload = async (payload: {
    subject: RequestSubject;
    target_id: string;
    notes: string;
    attachment_url?: string;
  }) => {
    await withAdminFetch('/api/admin/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setSuccess('Request submitted for approval');
    await loadRequests();
  };

  const openRequestModal = (subject: RequestSubject, targetId = '') => {
    setRequestModalSubject(subject);
    setRequestModalTarget(targetId);
    setRequestModalOpen(true);
  };

  const submitRequest = async () => {
    setError(null);
    setSuccess(null);

    try {
      await submitRequestPayload({
        subject: requestForm.subject,
        target_id: requestForm.target,
        notes: requestForm.notes,
        attachment_url: requestForm.attachment_url || undefined,
      });
      setRequestForm({ subject: 'OTHER', target: '', notes: '', attachment_url: '' });
      setActiveSection('requests');
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Request failed');
    }
  };

  const reviewRequest = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await withAdminFetch('/api/admin/requests', {
        method: 'PATCH',
        body: JSON.stringify({ id, status }),
      });
      setSuccess(`Request ${status}`);
      await loadRequests();
    } catch (reviewError: unknown) {
      setError(reviewError instanceof Error ? reviewError.message : 'Request failed');
    }
  };

  const assignRole = async () => {
    if (!roleTargetId.trim()) return;

    try {
      await withAdminFetch('/api/admin/access-control', {
        method: 'PATCH',
        body: JSON.stringify({ id: roleTargetId.trim(), role: roleValue }),
      });
      setSuccess('Role assigned');
      await loadAccess();
    } catch (assignError: unknown) {
      setError(assignError instanceof Error ? assignError.message : 'Request failed');
    }
  };

  const createAdmin = async () => {
    const normalizedEmail = createAdminForm.email.trim().toLowerCase();

    if (!createAdminForm.first_name.trim() || !createAdminForm.last_name.trim() || !normalizedEmail) {
      setError('First name, last name, and email are required');
      return;
    }

    if (!normalizedEmail.endsWith('@ruehl.app')) {
      setError('Admin email must use @ruehl.app');
      return;
    }

    try {
      const response = (await withAdminFetch('/api/admin/create-admin', {
        method: 'POST',
        body: JSON.stringify({
          first_name: createAdminForm.first_name.trim(),
          last_name: createAdminForm.last_name.trim(),
          email: normalizedEmail,
          role: createAdminForm.role,
        }),
      })) as { admin?: { employee_id?: string; email?: string }; temporary_password?: string };

      const employeeId = response.admin?.employee_id || 'RUEHL-EMP-UNSET';
      const email = response.admin?.email || normalizedEmail;
      const temporaryPassword = response.temporary_password || 'temporary password generated';
      setSuccess(`Admin created: ${employeeId} (${email}) | Temp password: ${temporaryPassword}`);

      setCreateAdminForm({
        first_name: '',
        last_name: '',
        email: '',
        role: 'ANALYST',
      });
      await loadAccess();
    } catch (createError: unknown) {
      setError(createError instanceof Error ? createError.message : 'Request failed');
    }
  };

  if (checking) return <div className="min-h-screen bg-black" />;

  const section = SECTIONS.find((item) => item.id === activeSection);

  return (
    <div className="min-h-screen bg-[#070809] text-white">
      <AdminLayout
        sidebar={
          <>
            <div className="mb-5">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500">RUEHL</p>
              <h1 className="mt-2 text-3xl font-black">Intelligence Control</h1>
              <p className="mt-2 text-xs text-gray-400">Role: {role}</p>
            </div>
            <nav className="space-y-2">
              {SECTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                    activeSection === item.id
                      ? 'border-cyan-400/35 bg-cyan-500/20 text-cyan-200'
                      : 'border-white/10 bg-white/[0.02] text-gray-300 hover:bg-white/[0.06]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <button type="button" onClick={() => router.push('/')} className="mt-6 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm">
              Exit Admin
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <header>
            <h2 className="text-3xl font-black tracking-tight">{section?.label}</h2>
            <p className="text-sm text-gray-400">{section?.description}</p>
          </header>

          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
          {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</div>}

          {loading && !['users', 'moderation'].includes(activeSection) ? (
            <AdminCard title="Loading"><p className="text-sm text-gray-400">Loading…</p></AdminCard>
          ) : (
            <>
              {activeSection === 'dashboard' && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <AdminCard title="Total Users"><p className="text-3xl font-black">{Number((dashboard.metrics as GenericItem | undefined)?.total_users || 0)}</p></AdminCard>
                  <AdminCard title="Active Users"><p className="text-3xl font-black">{Number((dashboard.metrics as GenericItem | undefined)?.active_users || 0)}</p></AdminCard>
                  <AdminCard title="Posts Today"><p className="text-3xl font-black">{Number((dashboard.metrics as GenericItem | undefined)?.posts_today || 0)}</p></AdminCard>
                  <AdminCard title="Growth %"><p className="text-3xl font-black">{Number((dashboard.growth as GenericItem | undefined)?.posts_growth_7d || 0)}%</p></AdminCard>
                  <AdminCard title="Chart Activity"><div className="h-32 rounded-lg border border-white/10 bg-black/30" /></AdminCard>
                  <AdminCard title="Top Sound / Top Genre">
                    <p className="text-sm text-gray-300">Top Sound: {String((((charts.top_sounds as GenericItem[] | undefined) || [])[0]?.track_name || '-'))}</p>
                    <p className="mt-2 text-sm text-gray-300">Top Genre: {String((((charts.genre_performance as GenericItem[] | undefined) || [])[0]?.genre || '-'))}</p>
                  </AdminCard>
                </div>
              )}

              {activeSection === 'charts_analytics' && (
                <AdminCard title="Charts Analytics">
                  <SimpleTable
                    headers={['Track', 'Artist', 'Posts', 'Engagement', 'Growth', 'Health']}
                    rows={(((charts.top_sounds as GenericItem[] | undefined) || []).map((row) => [
                      String(row.track_name || ''),
                      String(row.artist_name || ''),
                      Number(row.total_posts || 0),
                      Number(row.total_engagement || 0),
                      `${Number(row.growth_rate_24h_vs_7d || 0).toFixed(2)}%`,
                      String(row.health_status || '-'),
                    ]))}
                  />
                </AdminCard>
              )}

              {activeSection === 'access_control' && !has('can_manage_system') && <AdminCard title="Access Restricted"><p className="text-sm text-red-300">Access Restricted</p></AdminCard>}
              {activeSection === 'access_control' && has('can_manage_system') && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <AdminCard title="Admin Users">
                    <SimpleTable
                      headers={['Employee ID', 'Email', 'Role', 'Created']}
                      rows={(access?.items || []).map((row) => [
                        row.employee_id || '-',
                        row.email || '-',
                        row.is_root_admin ? `${row.role} (Protected)` : row.role,
                        row.created_at,
                      ])}
                    />
                  </AdminCard>
                  <div className="space-y-4">
                    <AdminCard title="Create Admin">
                      <div className="space-y-3">
                        <input value={createAdminForm.first_name} onChange={(event) => setCreateAdminForm((prev) => ({ ...prev, first_name: event.target.value }))} placeholder="First name" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
                        <input value={createAdminForm.last_name} onChange={(event) => setCreateAdminForm((prev) => ({ ...prev, last_name: event.target.value }))} placeholder="Last name" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
                        <input value={createAdminForm.email} onChange={(event) => setCreateAdminForm((prev) => ({ ...prev, email: event.target.value }))} type="email" placeholder="name@ruehl.app" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
                        <InlineSelect
                          value={createAdminForm.role}
                          options={assignableRoleOptions}
                          onChange={(nextRole) => setCreateAdminForm((prev) => ({ ...prev, role: nextRole }))}
                          ariaLabel="Create admin role"
                        />
                        <button type="button" onClick={createAdmin} className="rounded-lg border border-cyan-400/35 bg-cyan-500/20 px-4 py-2 text-sm text-cyan-200">Create Admin</button>
                      </div>
                    </AdminCard>
                    <AdminCard title="Assign Role">
                      <div className="space-y-3">
                        {roleTargetOptions.length > 0 ? (
                          <InlineSelect
                            value={roleTargetId || roleTargetOptions[0].value}
                            options={roleTargetOptions}
                            onChange={setRoleTargetId}
                            ariaLabel="Select admin user"
                          />
                        ) : (
                          <p className="text-sm text-gray-400">No editable admins available.</p>
                        )}
                        <InlineSelect
                          value={roleValue}
                          options={assignableRoleOptions}
                          onChange={setRoleValue}
                          ariaLabel="Assign role"
                        />
                        <button type="button" onClick={assignRole} disabled={!roleTargetOptions.length} className="rounded-lg border border-cyan-400/35 bg-cyan-500/20 px-4 py-2 text-sm text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50">Assign Role</button>
                      </div>
                    </AdminCard>
                  </div>
                </div>
              )}

              {activeSection === 'requests' && !has('can_submit_requests') && <AdminCard title="Access Restricted"><p className="text-sm text-red-300">Access Restricted</p></AdminCard>}
              {activeSection === 'requests' && has('can_submit_requests') && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <AdminCard title="Submit Request">
                    <div className="space-y-3">
                      <InlineSelect
                        value={requestForm.subject}
                        options={requestSubjectOptions}
                        onChange={(subject) => setRequestForm((prev) => ({ ...prev, subject }))}
                        ariaLabel="Request subject"
                      />
                      <input value={requestForm.target} onChange={(event) => setRequestForm((prev) => ({ ...prev, target: event.target.value }))} placeholder={targetFieldConfig.placeholder} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
                      <p className="text-xs text-gray-400">{targetFieldConfig.helper}</p>
                      <textarea rows={4} value={requestForm.notes} onChange={(event) => setRequestForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder={targetFieldConfig.notesPlaceholder} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
                      <input value={requestForm.attachment_url} onChange={(event) => setRequestForm((prev) => ({ ...prev, attachment_url: event.target.value }))} placeholder="Attachment URL (optional)" className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
                      <button type="button" onClick={submitRequest} className="rounded-lg border border-cyan-400/35 bg-cyan-500/20 px-4 py-2 text-sm text-cyan-200">Submit Request</button>
                    </div>
                  </AdminCard>
                  <AdminCard title="Review Queue">
                    <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
                      {(requests?.items || []).map((item) => (
                        <div key={item.id} className="rounded-lg border border-white/10 bg-black/30 p-3">
                          <div className="flex items-center justify-between text-xs text-gray-400"><span>{item.subject}</span><span>{item.status}</span></div>
                          <p className="mt-1 text-sm text-gray-200">Target: {item.target_id || item.target || '-'}</p>
                          <p className="mt-1 text-xs text-gray-400">{item.notes || '-'}</p>
                          {item.attachment_url && <a className="mt-2 inline-block text-xs text-cyan-300 underline" href={item.attachment_url} target="_blank" rel="noreferrer">Attachment</a>}
                          {requests?.can_review && isRootAdmin && item.status === 'pending' && (
                            <div className="mt-3 flex gap-2">
                              <button type="button" onClick={() => void reviewRequest(item.id, 'approved')} className="rounded-md border border-emerald-400/35 bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">Approve</button>
                              <button type="button" onClick={() => void reviewRequest(item.id, 'rejected')} className="rounded-md border border-red-400/35 bg-red-500/20 px-3 py-1 text-xs text-red-200">Reject</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </AdminCard>
                </div>
              )}

              {(activeSection === 'sounds_intelligence' || activeSection === 'posts_intelligence' || activeSection === 'scoring_debug') && !has('can_view_charts') && (
                <AdminCard title="Access Restricted"><p className="text-sm text-red-300">Access Restricted</p></AdminCard>
              )}

              {activeSection === 'sounds_intelligence' && has('can_view_charts') && (
                <AdminCard title="Sounds Intelligence">
                  <SimpleTable
                    headers={['Track', 'Artist', 'Usage Count', 'Total Posts', 'Unique Users', 'Engagement', 'Chart Score', 'Alignment Score', 'Growth Velocity']}
                    rows={listData.map((row) => [String(row.track_name || ''), String(row.artist_name || ''), Number(row.usage_count || 0), Number(row.total_posts || 0), Number(row.unique_users || 0), Number(row.engagement_score || 0), Number(row.chart_score || 0), Number(row.alignment_score || 0), Number(row.growth_velocity || 0)])}
                  />
                </AdminCard>
              )}

              {activeSection === 'posts_intelligence' && has('can_view_charts') && (
                <AdminCard title="Posts Intelligence">
                  <SimpleTable headers={['Post ID', 'User', 'Sound ID', 'Engagement', 'Alignment', 'Contribution']} rows={listData.map((row) => [String(row.post_id || ''), String(row.user || ''), String(row.sound_id || ''), Number(row.engagement || 0), Number(row.alignment_score || 0), Number(row.contribution_to_charts || 0)])} />
                </AdminCard>
              )}

              {activeSection === 'scoring_debug' && has('can_view_charts') && (
                <AdminCard title="Scoring Debug">
                  <SimpleTable headers={['Track', 'Artist', 'Engagement Score', 'Velocity Score', 'Alignment Score', 'Final Score']} rows={listData.map((row) => [String(row.track_name || ''), String(row.artist_name || ''), Number(row.engagement_score || 0), Number(row.velocity_score || 0), Number(row.alignment_score || 0), Number(row.final_score || 0)])} />
                </AdminCard>
              )}

              {activeSection === 'activity_monitor' && (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <AdminCard title="Posts Per Minute"><p className="text-3xl font-black">{Number(dashboard.posts_per_minute || 0)}</p></AdminCard>
                  <AdminCard title="Sound Usage Spikes"><SimpleTable headers={['Sound ID', 'Current', 'Previous', 'Ratio']} rows={(((dashboard.sound_usage_spikes as GenericItem[] | undefined) || []).map((row) => [String(row.sound_id || ''), Number(row.current_count || 0), Number(row.previous_count || 0), Number(row.spike_ratio || 0)]))} /></AdminCard>
                  <AdminCard title="Abnormal Activity"><SimpleTable headers={['User ID', 'Posts (60m)']} rows={(((dashboard.abnormal_activity as GenericItem[] | undefined) || []).map((row) => [String(row.user_id || ''), Number(row.post_count || 0)]))} /></AdminCard>
                </div>
              )}

              {activeSection === 'users' && (
                <AdminCard
                  title="Users"
                  description="Directory with account type, category, and verification. Sensitive actions still go through Requests."
                >
                  {loading && <p className="mb-2 text-xs text-gray-500">Updating list…</p>}
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="min-w-[200px] flex-1">
                      <p className="mb-1 text-xs text-gray-500">Account type</p>
                      <InlineSelect<'all' | AccountType>
                        value={usersAccountTypeFilter}
                        options={[
                          { value: 'all', label: 'All types' },
                          { value: 'personal', label: ACCOUNT_TYPE_LABELS.personal },
                          { value: 'business', label: ACCOUNT_TYPE_LABELS.business },
                          { value: 'media', label: ACCOUNT_TYPE_LABELS.media },
                        ]}
                        onChange={setUsersAccountTypeFilter}
                        ariaLabel="Filter by account type"
                      />
                    </div>
                    <div className="min-w-[200px] flex-1">
                      <p className="mb-1 text-xs text-gray-500">Verification status</p>
                      <InlineSelect<'all' | 'none' | NonNullable<BadgeVerificationStatus>>
                        value={usersBadgeFilter}
                        options={[
                          { value: 'all', label: 'All statuses' },
                          { value: 'none', label: 'None' },
                          { value: 'pending', label: 'Pending' },
                          { value: 'approved', label: 'Approved' },
                          { value: 'rejected', label: 'Rejected' },
                        ]}
                        onChange={setUsersBadgeFilter}
                        ariaLabel="Filter by verification status"
                      />
                    </div>
                  </div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openRequestModal('VERIFY_USER')}
                      className="rounded-lg border border-cyan-400/35 bg-cyan-500/20 px-3 py-1.5 text-xs text-cyan-200"
                    >
                      Verify User (Request)
                    </button>
                    <button
                      type="button"
                      onClick={() => openRequestModal('SHADOW_BAN_USER')}
                      className="rounded-lg border border-cyan-400/35 bg-cyan-500/20 px-3 py-1.5 text-xs text-cyan-200"
                    >
                      Shadow Ban (Request)
                    </button>
                    <button
                      type="button"
                      onClick={() => openRequestModal('RESTRICT_USER')}
                      className="rounded-lg border border-cyan-400/35 bg-cyan-500/20 px-3 py-1.5 text-xs text-cyan-200"
                    >
                      Restrict User (Request)
                    </button>
                    <button
                      type="button"
                      onClick={() => openRequestModal('DELETE_USER')}
                      className="rounded-lg border border-red-400/35 bg-red-500/20 px-3 py-1.5 text-xs text-red-200"
                    >
                      Delete User (Request)
                    </button>
                  </div>
                  <div className="max-w-full overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-left text-gray-400">
                          {['User', 'Email', 'Account type', 'Category', 'Verification', 'Admin', 'Created'].map((header) => (
                            <th key={header} className="whitespace-nowrap px-3 py-2 font-medium">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {listData.map((row) => {
                          const r = row as GenericItem;
                          const at = parseAccountType(r.account_type);
                          const acRaw = r.account_category == null ? null : String(r.account_category);
                          const ac = acRaw as AccountCategory | null;
                          return (
                            <tr key={String(r.id)} className="border-b border-white/5">
                              <td className="whitespace-nowrap px-3 py-2 text-gray-200">{String(r.username || '—')}</td>
                              <td className="max-w-[14rem] truncate px-3 py-2 text-gray-200">{String(r.email || '—')}</td>
                              <td className="whitespace-nowrap px-3 py-2 text-gray-200">{at ? getTypeLabel(at) : '—'}</td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  {at && ac ? (
                                    <>
                                      <AccountTypeChip accountType={at} accountCategory={ac} displayCategoryLabel />
                                      <span className="text-gray-300">{getCategoryLabel(ac)}</span>
                                    </>
                                  ) : (
                                    <span className="text-gray-500">—</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <VerificationBadge
                                    status={parseBadgeStatus(r.badge_verification_status)}
                                    legacyIsVerified={Boolean(r.is_verified)}
                                    size="sm"
                                  />
                                  <span className="text-xs text-gray-500">
                                    {r.badge_verification_status ? String(r.badge_verification_status) : 'none'}
                                  </span>
                                </div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-gray-200">{r.is_admin ? 'Yes' : '—'}</td>
                              <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-400">{String(r.created_at || '—')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </AdminCard>
              )}

              {activeSection === 'moderation' && (
                <AdminCard
                  title={section?.label || 'Moderation'}
                  description="Verification submissions (`verification_submissions`). Approve/reject updates review fields; badge sync is handled in the database."
                >
                  <div className="mb-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openRequestModal('RESTRICT_USER')}
                      className="rounded-lg border border-cyan-400/35 bg-cyan-500/20 px-3 py-1.5 text-xs text-cyan-200"
                    >
                      Restrict Account (Request)
                    </button>
                  </div>
                  {loading ? (
                    <div className="space-y-2">
                      {[0, 1, 2, 3, 4].map((key) => (
                        <div key={key} className="h-14 animate-pulse rounded-lg bg-white/5" />
                      ))}
                    </div>
                  ) : (listData as VerificationQueueRow[]).length === 0 ? (
                    <p className="text-sm text-gray-400">No pending submissions</p>
                  ) : (
                    <div className="max-w-full overflow-x-auto">
                      <table className="min-w-[56rem] text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-left text-gray-400">
                            {['User', 'Type', 'Category', 'Legal name', 'Website', 'Submitted', 'Status', 'Actions'].map((header) => (
                              <th key={header} className="whitespace-nowrap px-3 py-2 font-medium">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(listData as VerificationQueueRow[]).map((sub) => {
                            const at = sub.accountType;
                            const ac = sub.accountCategory as AccountCategory;
                            return (
                              <tr key={sub.id} className="border-b border-white/5 align-top">
                                <td className="px-3 py-2">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-medium text-gray-200">{sub.username ? `@${sub.username}` : sub.userId}</span>
                                    <div className="flex items-center gap-2">
                                      <VerificationBadge
                                        status={parseBadgeStatus(sub.profileBadgeVerificationStatus)}
                                        size="sm"
                                      />
                                      <span className="text-xs text-gray-500">
                                        {sub.profileBadgeVerificationStatus || 'none'}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-gray-200">{getTypeLabel(at)}</td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <AccountTypeChip accountType={at} accountCategory={ac} displayCategoryLabel />
                                    <span className="text-gray-300">{getCategoryLabel(ac)}</span>
                                  </div>
                                </td>
                                <td className="max-w-[12rem] px-3 py-2 text-gray-200">{sub.legalEntityName}</td>
                                <td className="max-w-[10rem] truncate px-3 py-2">
                                  {sub.websiteUrl ? (
                                    <a
                                      href={sub.websiteUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-cyan-300 underline"
                                    >
                                      {sub.websiteUrl}
                                    </a>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-400">{sub.submittedAt}</td>
                                <td className="whitespace-nowrap px-3 py-2 text-xs uppercase text-gray-400">{sub.status}</td>
                                <td className="px-3 py-2">
                                  <div className="flex min-w-[12rem] flex-col gap-2">
                                    <button
                                      type="button"
                                      className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-gray-200"
                                      onClick={() =>
                                        void (async () => {
                                          try {
                                            const doc = (await withAdminFetch(`/api/admin/verification/${sub.id}/document`)) as {
                                              signedUrl?: string;
                                            };
                                            if (doc.signedUrl) window.open(doc.signedUrl, '_blank', 'noopener,noreferrer');
                                          } catch (e: unknown) {
                                            setError(e instanceof Error ? e.message : 'Could not open document');
                                          }
                                        })()
                                      }
                                    >
                                      View document
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded-md border border-emerald-400/35 bg-emerald-500/15 px-2 py-1 text-xs text-emerald-200"
                                      onClick={() =>
                                        void (async () => {
                                          try {
                                            await withAdminFetch(`/api/admin/verification/${sub.id}`, {
                                              method: 'PATCH',
                                              body: JSON.stringify({ status: 'approved' }),
                                            });
                                            setSuccess('Submission approved');
                                            await loadSection();
                                          } catch (e: unknown) {
                                            setError(e instanceof Error ? e.message : 'Approve failed');
                                          }
                                        })()
                                      }
                                    >
                                      Approve
                                    </button>
                                    <input
                                      type="text"
                                      placeholder="Rejection reason (required)"
                                      value={rejectDraftById[sub.id] || ''}
                                      onChange={(event) =>
                                        setRejectDraftById((prev) => ({ ...prev, [sub.id]: event.target.value }))
                                      }
                                      className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-gray-200"
                                    />
                                    <button
                                      type="button"
                                      className="rounded-md border border-red-400/35 bg-red-500/15 px-2 py-1 text-xs text-red-200"
                                      onClick={() =>
                                        void (async () => {
                                          const reason = (rejectDraftById[sub.id] || '').trim();
                                          if (!reason) {
                                            setError('Rejection reason is required');
                                            return;
                                          }
                                          try {
                                            await withAdminFetch(`/api/admin/verification/${sub.id}`, {
                                              method: 'PATCH',
                                              body: JSON.stringify({ status: 'rejected', rejection_reason: reason }),
                                            });
                                            setRejectDraftById((prev) => {
                                              const next = { ...prev };
                                              delete next[sub.id];
                                              return next;
                                            });
                                            setSuccess('Submission rejected');
                                            await loadSection();
                                          } catch (e: unknown) {
                                            setError(e instanceof Error ? e.message : 'Reject failed');
                                          }
                                        })()
                                      }
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </AdminCard>
              )}

              {['content', 'reports', 'music', 'genres', 'feed', 'support', 'system'].includes(activeSection) && (
                <AdminCard title={section?.label || 'Section'} description="Structured data view. Any sensitive action must be submitted through Requests.">
                  {activeSection === 'content' && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => openRequestModal('DELETE_CONTENT')} className="rounded-lg border border-red-400/35 bg-red-500/20 px-3 py-1.5 text-xs text-red-200">Delete Content (Request)</button>
                      <button type="button" onClick={() => openRequestModal('REMOVE_DISCOVERY')} className="rounded-lg border border-cyan-400/35 bg-cyan-500/20 px-3 py-1.5 text-xs text-cyan-200">Remove Discovery (Request)</button>
                      <button type="button" onClick={() => openRequestModal('BOOST_PROMOTE_CONTENT')} className="rounded-lg border border-cyan-400/35 bg-cyan-500/20 px-3 py-1.5 text-xs text-cyan-200">Boost/Promote (Request)</button>
                    </div>
                  )}
                  {activeSection === 'feed' && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => openRequestModal('OVERRIDE_CHART')} className="rounded-lg border border-cyan-400/35 bg-cyan-500/20 px-3 py-1.5 text-xs text-cyan-200">Override Charts (Request)</button>
                      <button type="button" onClick={() => openRequestModal('REMOVE_DISCOVERY')} className="rounded-lg border border-cyan-400/35 bg-cyan-500/20 px-3 py-1.5 text-xs text-cyan-200">Remove Discovery (Request)</button>
                    </div>
                  )}
                  <SimpleTable
                    headers={['Field A', 'Field B', 'Field C', 'Governance']}
                    rows={listData.slice(0, 50).map((row) => [
                      String(row.id || row.username || row.track_name || row.subject || '-'),
                      String(row.created_at || row.reason || row.artist_name || '-'),
                      String(row.status || row.admin_status || row.priority_weight || '-'),
                      'Submit Request',
                    ])}
                  />
                </AdminCard>
              )}
            </>
          )}

          <RequestModal
            open={requestModalOpen}
            onClose={() => setRequestModalOpen(false)}
            initialSubject={requestModalSubject}
            initialTargetId={requestModalTarget}
            onSubmit={async (payload) => {
              setError(null);
              setSuccess(null);
              try {
                await submitRequestPayload(payload);
              } catch (submitError: unknown) {
                const message = submitError instanceof Error ? submitError.message : 'Request failed';
                setError(message);
                throw submitError;
              }
            }}
          />
        </div>
      </AdminLayout>
    </div>
  );
}
