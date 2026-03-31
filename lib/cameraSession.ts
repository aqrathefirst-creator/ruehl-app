type FacingMode = 'user' | 'environment';

let prewarmedStream: MediaStream | null = null;
let prewarmedFacing: FacingMode | null = null;
let prewarmPromise: Promise<MediaStream | null> | null = null;

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
      prewarmedStream = stream;
      prewarmedFacing = facingMode;
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

  const stream = prewarmedStream;
  prewarmedStream = null;
  prewarmedFacing = null;
  return stream;
};