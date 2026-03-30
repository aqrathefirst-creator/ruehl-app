export type PendingVerification = {
  method: 'email' | 'phone';
  value: string;
  username?: string;
};

const STORAGE_KEY = 'ruehl:pending-verification';

export function savePendingVerification(payload: PendingVerification) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function loadPendingVerification(): PendingVerification | null {
  if (typeof window === 'undefined') return null;

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingVerification;
    if (!parsed?.method || !parsed?.value) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingVerification() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}