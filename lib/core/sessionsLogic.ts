export type CanonicalSessionStatus = 'OPEN' | 'MATCHED' | 'COMPLETED' | 'CANCELLED';
export type CanonicalRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';
export type LiveSessionStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export function statusToCanonical(status: string | null | undefined): CanonicalSessionStatus {
  const value = (status || '').toUpperCase();
  if (value === 'MATCHED') return 'MATCHED';
  if (value === 'COMPLETED') return 'COMPLETED';
  if (value === 'CANCELLED') return 'CANCELLED';
  return 'OPEN';
}

export function requestStatusToCanonical(status: string | null | undefined): CanonicalRequestStatus {
  const value = (status || '').toUpperCase();
  if (value === 'ACCEPTED') return 'ACCEPTED';
  if (value === 'DECLINED') return 'DECLINED';
  return 'PENDING';
}

export function formatWhen(iso: string | null | undefined) {
  if (!iso) return 'Any time';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return 'Any time';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function normalizeLiveStatus(value: string | null | undefined): LiveSessionStatus {
  const status = (value || '').toLowerCase();
  if (status === 'pending' || status === 'active' || status === 'completed' || status === 'cancelled') {
    return status;
  }
  return 'pending';
}
