export type CreateUploadSnapshot = {
  active: boolean;
  progress: number;
  status: string;
  error: string | null;
  itemId: string | null;
  updatedAt: number;
};

type UploadTaskHelpers = {
  setProgress: (progress: number, status?: string) => void;
  retry: <T>(label: string, task: () => Promise<T>, attempts?: number) => Promise<T>;
};

type UploadTask = (helpers: UploadTaskHelpers) => Promise<void>;

const listeners = new Set<(snapshot: CreateUploadSnapshot) => void>();

const initialSnapshot: CreateUploadSnapshot = {
  active: false,
  progress: 0,
  status: '',
  error: null,
  itemId: null,
  updatedAt: Date.now(),
};

let snapshot: CreateUploadSnapshot = initialSnapshot;
let activePromise: Promise<void> | null = null;
let resetTimer: number | null = null;

const emit = () => {
  snapshot = { ...snapshot, updatedAt: Date.now() };
  listeners.forEach((listener) => listener(snapshot));
};

const setSnapshot = (next: Partial<CreateUploadSnapshot>) => {
  snapshot = { ...snapshot, ...next };
  emit();
};

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export const getCreateUploadSnapshot = () => snapshot;

export const subscribeToCreateUpload = (listener: (snapshot: CreateUploadSnapshot) => void) => {
  listeners.add(listener);
  listener(snapshot);

  return () => {
    listeners.delete(listener);
  };
};

export const hasActiveCreateUpload = () => snapshot.active;

export const clearCreateUploadState = () => {
  if (resetTimer) {
    window.clearTimeout(resetTimer);
    resetTimer = null;
  }

  snapshot = { ...initialSnapshot, updatedAt: Date.now() };
  emit();
};

export const startCreateUpload = (task: UploadTask) => {
  if (activePromise) {
    throw new Error('A post upload is already in progress.');
  }

  if (resetTimer) {
    window.clearTimeout(resetTimer);
    resetTimer = null;
  }

  const itemId = `create-upload-${Date.now()}`;
  setSnapshot({
    active: true,
    progress: 4,
    status: 'Starting upload...',
    error: null,
    itemId,
  });

  const retry: UploadTaskHelpers['retry'] = async (label, runner, attempts = 3) => {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await runner();
      } catch (error) {
        lastError = error;
        if (attempt >= attempts) break;
        setSnapshot({ status: `${label} retry ${attempt + 1}/${attempts}...` });
        await sleep(Math.min(3000, attempt * 900));
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`${label} failed.`);
  };

  activePromise = (async () => {
    try {
      await task({
        setProgress: (progress, status) => {
          setSnapshot({
            active: true,
            progress: Math.max(0, Math.min(100, progress)),
            status: status || snapshot.status,
            error: null,
            itemId,
          });
        },
        retry,
      });

      setSnapshot({
        active: false,
        progress: 100,
        status: 'Upload complete',
        error: null,
        itemId,
      });

      resetTimer = window.setTimeout(() => {
        clearCreateUploadState();
      }, 1800);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed.';
      setSnapshot({
        active: false,
        error: message,
        status: 'Upload failed',
        itemId,
      });
      throw error;
    } finally {
      activePromise = null;
    }
  })();

  return { itemId, promise: activePromise };
};