export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'ANALYST' | 'MODERATOR';

export type AdminPermission =
  | 'can_view_users'
  | 'can_edit_users'
  | 'can_view_charts'
  | 'can_export_reports'
  | 'can_moderate_content'
  | 'can_manage_system'
  | 'can_submit_requests'
  | 'can_review_requests';

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  SUPER_ADMIN: [
    'can_view_users',
    'can_edit_users',
    'can_view_charts',
    'can_export_reports',
    'can_moderate_content',
    'can_manage_system',
    'can_submit_requests',
    'can_review_requests',
  ],
  ADMIN: [
    'can_view_users',
    'can_edit_users',
    'can_view_charts',
    'can_export_reports',
    'can_moderate_content',
    'can_manage_system',
    'can_submit_requests',
  ],
  ANALYST: ['can_view_users', 'can_view_charts', 'can_export_reports', 'can_submit_requests'],
  MODERATOR: ['can_view_users', 'can_moderate_content', 'can_submit_requests'],
};

export function getRolePermissions(role: AdminRole): AdminPermission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasAdminPermission(role: AdminRole, permission: AdminPermission): boolean {
  return getRolePermissions(role).includes(permission);
}
