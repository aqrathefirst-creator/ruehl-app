import type { SupabaseClient } from '@supabase/supabase-js';

export async function generateEmployeeId(
  adminClient: SupabaseClient,
  options: { isRootAdmin?: boolean; manualEmployeeId?: string } = {}
): Promise<string> {
  if (options.isRootAdmin) {
    const manualId = options.manualEmployeeId?.trim();
    if (!manualId) throw new Error('ROOT employee_id must be manually assigned');
    return manualId;
  }

  const { data, error } = await adminClient
    .from('admin_users')
    .select('employee_id')
    .ilike('employee_id', 'RUEHL-EMP-%');

  if (error) {
    throw new Error(error.message || 'Unable to generate employee ID');
  }

  const maxSequence = (data || []).reduce((max, row) => {
    const value = typeof row.employee_id === 'string' ? row.employee_id : '';
    const match = /^RUEHL-EMP-(\d{4,})$/i.exec(value);
    if (!match) return max;
    const number = Number(match[1]);
    if (!Number.isFinite(number)) return max;
    return Math.max(max, number);
  }, 0);

  return `RUEHL-EMP-${String(maxSequence + 1).padStart(4, '0')}`;
}
