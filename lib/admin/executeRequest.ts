import type { SupabaseClient } from '@supabase/supabase-js';

export type GovernedRequestSubject =
  | 'VERIFY_USER'
  | 'SHADOW_BAN_USER'
  | 'RESTRICT_USER'
  | 'DELETE_USER'
  | 'CHANGE_USERNAME'
  | 'CHANGE_EMAIL'
  | 'CHANGE_SECURITY_SETTINGS'
  | 'ADD_GENRE'
  | 'REMOVE_GENRE'
  | 'MODIFY_GENRE'
  | 'OVERRIDE_CHART'
  | 'REMOVE_DISCOVERY'
  | 'BOOST_PROMOTE_CONTENT'
  | 'DELETE_CONTENT'
  | 'MODIFY_MUSIC_METADATA'
  | 'SECURITY_CHANGE'
  | 'OTHER';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveUserTargetId(admin: SupabaseClient, target: string) {
  const normalized = target.trim();
  if (!normalized) return null;

  if (UUID_PATTERN.test(normalized)) return normalized;

  const username = normalized.replace(/^@/, '');
  if (!username) return null;

  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Unable to resolve target user');
  return data?.id || null;
}

export async function executeRequest(params: {
  admin: SupabaseClient;
  requestId: string;
  reviewerAdminId: string;
  subject: GovernedRequestSubject;
  targetId: string;
  notes: string | null;
}) {
  const { admin, requestId, reviewerAdminId, subject } = params;
  const targetId = (params.targetId || '').trim();
  const notes = (params.notes || '').trim();

  const userTargetSubjects: GovernedRequestSubject[] = [
    'VERIFY_USER',
    'SHADOW_BAN_USER',
    'RESTRICT_USER',
    'DELETE_USER',
    'CHANGE_USERNAME',
    'CHANGE_EMAIL',
    'CHANGE_SECURITY_SETTINGS',
    'SECURITY_CHANGE',
  ];

  const resolvedUserId = userTargetSubjects.includes(subject)
    ? await resolveUserTargetId(admin, targetId)
    : null;

  switch (subject) {
    case 'VERIFY_USER': {
      if (!resolvedUserId) throw new Error('Target user not found. Use a valid UUID or username.');
      const { error } = await admin.from('profiles').update({ is_verified: true, verified: true }).eq('id', resolvedUserId);
      if (error) throw new Error(error.message);
      break;
    }
    case 'SHADOW_BAN_USER': {
      if (!resolvedUserId) throw new Error('Target user not found. Use a valid UUID or username.');
      const { error } = await admin.from('profiles').update({ shadow_banned: true }).eq('id', resolvedUserId);
      if (error) throw new Error(error.message);
      break;
    }
    case 'RESTRICT_USER': {
      if (!resolvedUserId) throw new Error('Target user not found. Use a valid UUID or username.');
      const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await admin.from('profiles').update({ suspended_until: until }).eq('id', resolvedUserId);
      if (error) throw new Error(error.message);
      break;
    }
    case 'DELETE_USER': {
      if (!resolvedUserId) throw new Error('Target user not found. Use a valid UUID or username.');
      const deleteResult = await admin.auth.admin.deleteUser(resolvedUserId);
      if (deleteResult.error) throw new Error(deleteResult.error.message);
      break;
    }
    case 'CHANGE_USERNAME': {
      if (!resolvedUserId) throw new Error('Target user not found. Use a valid UUID or username.');
      if (!notes) throw new Error('Notes must include the new username.');
      const { error } = await admin.from('profiles').update({ username: notes }).eq('id', resolvedUserId);
      if (error) throw new Error(error.message);
      break;
    }
    case 'CHANGE_EMAIL': {
      if (!resolvedUserId) throw new Error('Target user not found. Use a valid UUID or username.');
      if (!notes) throw new Error('Notes must include the new email address.');
      const updateResult = await admin.auth.admin.updateUserById(resolvedUserId, { email: notes });
      if (updateResult.error) throw new Error(updateResult.error.message);
      break;
    }
    case 'ADD_GENRE': {
      if (!targetId) throw new Error('target_id is required for ADD_GENRE');
      const { error } = await admin.from('admin_genres').insert({ name: targetId, priority_weight: 100, is_active: true });
      if (error) throw new Error(error.message);
      break;
    }
    case 'REMOVE_GENRE': {
      if (!targetId) throw new Error('target_id is required for REMOVE_GENRE');
      const { error } = await admin.from('admin_genres').delete().ilike('name', targetId);
      if (error) throw new Error(error.message);
      break;
    }
    case 'MODIFY_GENRE': {
      if (!targetId || !notes) throw new Error('target_id and notes are required for MODIFY_GENRE');
      const { error } = await admin.from('admin_genres').update({ priority_weight: Number(notes) || 100 }).ilike('name', targetId);
      if (error) throw new Error(error.message);
      break;
    }
    case 'DELETE_CONTENT': {
      if (!targetId) throw new Error('target_id is required for DELETE_CONTENT');
      const { error } = await admin.from('posts').delete().eq('id', targetId);
      if (error) throw new Error(error.message);
      break;
    }
    case 'REMOVE_DISCOVERY': {
      if (!targetId) throw new Error('target_id is required for REMOVE_DISCOVERY');
      const { error } = await admin
        .from('posts')
        .update({ discovery_disabled: true, visibility_state: 'restricted' })
        .eq('id', targetId);
      if (error) throw new Error(error.message);
      break;
    }
    case 'BOOST_PROMOTE_CONTENT': {
      if (!targetId) throw new Error('target_id is required for BOOST_PROMOTE_CONTENT');
      const { error } = await admin
        .from('posts')
        .update({
          boosted_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          trending_override: true,
          visibility_state: 'normal',
          discovery_disabled: false,
          hidden_by_admin: false,
        })
        .eq('id', targetId);
      if (error) throw new Error(error.message);
      break;
    }
    case 'OVERRIDE_CHART':
    case 'MODIFY_MUSIC_METADATA':
    case 'CHANGE_SECURITY_SETTINGS':
    case 'SECURITY_CHANGE':
    case 'OTHER':
      // Requires operator-provided context in notes/target. Execution is intentionally constrained.
      break;
    default:
      throw new Error('Unsupported request subject');
  }

  const { error: logError } = await admin.from('admin_action_logs').insert({
    admin_id: reviewerAdminId,
    request_id: requestId,
    action_type: subject,
    target_id: targetId,
    executed_at: new Date().toISOString(),
  });

  if (logError) throw new Error(logError.message || 'Failed to write admin action log');
}
