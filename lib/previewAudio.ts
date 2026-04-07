let activeAudio: HTMLAudioElement | null = null;
let activeKey: string | null = null;

const listeners = new Set<(key: string | null) => void>();

const notify = () => {
  for (const listener of listeners) listener(activeKey);
};

const resetActive = () => {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio.onended = null;
  }

  activeAudio = null;
  activeKey = null;
  notify();
};

export const getActivePreviewKey = () => activeKey;

export const subscribePreviewAudio = (listener: (key: string | null) => void) => {
  listeners.add(listener);
  listener(activeKey);

  return () => {
    listeners.delete(listener);
  };
};

export const stopPreviewAudio = () => {
  resetActive();
};

export const playPreviewAudio = async (key: string, url: string | null | undefined) => {
  if (!url) return;

  if (activeAudio && activeKey === key) {
    if (!activeAudio.paused) {
      activeAudio.pause();
      notify();
      return;
    }

    try {
      await activeAudio.play();
      notify();
    } catch {
      resetActive();
    }

    return;
  }

  if (activeAudio && activeKey !== key) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio.onended = null;
  }

  if (!activeAudio || activeKey !== key) {
    activeAudio = new Audio(url);
    activeAudio.volume = 0.45;
    activeAudio.onended = () => {
      if (activeKey === key) resetActive();
    };
  }

  activeKey = key;
  notify();

  try {
    await activeAudio.play();
  } catch {
    resetActive();
  }
};
