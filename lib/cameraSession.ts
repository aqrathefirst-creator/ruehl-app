type FacingMode = 'user' | 'environment';

let prewarmedStream: MediaStream | null = null;
let prewarmedFacing: FacingMode | null = null;
let prewarmPromise: Promise<MediaStream | null> | null = null;
let prewarmTimeoutId: number | null = null;

const PREWARM_TTL_MS = 10_000;

const getConstraints = (facingMode: FacingMode): MediaStreamConstraints => ({
  video: {
    facingMode: { ideal: facingMode },
    width: { ideal: 1080 },
    height: { ideal: 1920 },
    aspectRatio: { ideal: 9 / 16 },
    frameRate: { ideal: 30, max: 30 },
  },
  audio: false,
});

const isStreamLive = (stream: MediaStream | null) => {
  return Boolean(stream && stream.getTracks().some((track) => track.readyState === 'live'));
};

export const hasPrewarmedCameraStream = (facingMode: FacingMode) => {
  return isStreamLive(prewarmedStream) && prewarmedFacing === facingMode;
};

export const clearPrewarmedCameraStream = () => {
  if (prewarmTimeoutId) {
    window.clearTimeout(prewarmTimeoutId);
    prewarmTimeoutId = null;
  }

  if (prewarmedStream) {
    prewarmedStream.getTracks().forEach((track) => track.stop());
  }

  prewarmedStream = null;
  prewarmedFacing = null;
  prewarmPromise = null;
};

export const prewarmCameraStream = async (facingMode: FacingMode = 'user') => {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return null;

  if (hasPrewarmedCameraStream(facingMode)) {
    return prewarmedStream;
  }

  if (prewarmPromise) {
    return prewarmPromise;
  }

  if (prewarmedStream && prewarmedFacing !== facingMode) {
    clearPrewarmedCameraStream();
  }

  prewarmPromise = navigator.mediaDevices
    .getUserMedia(getConstraints(facingMode))
    .then((stream) => {
      if (prewarmTimeoutId) {
        window.clearTimeout(prewarmTimeoutId);
      }

      prewarmedStream = stream;
      prewarmedFacing = facingMode;

      prewarmTimeoutId = window.setTimeout(() => {
        clearPrewarmedCameraStream();
      }, PREWARM_TTL_MS);

      return stream;
    })
    .catch(() => null)
    .finally(() => {
      prewarmPromise = null;
    });

  return prewarmPromise;
};

export const takePrewarmedCameraStream = (facingMode: FacingMode) => {
  if (!hasPrewarmedCameraStream(facingMode)) return null;

  if (prewarmTimeoutId) {
    window.clearTimeout(prewarmTimeoutId);
    prewarmTimeoutId = null;
  }

  const stream = prewarmedStream;
  prewarmedStream = null;
  prewarmedFacing = null;
  return stream;
};