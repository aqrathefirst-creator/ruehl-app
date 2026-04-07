import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ProcessMediaOptions = {
  mobileVideo?: boolean;
  onProgress?: (progress: number, message?: string) => void;
};

const MAX_IMAGE_MB = 15;
const MAX_VIDEO_MB = 500;

const waitForMediaEvent = (element: HTMLMediaElement, eventName: string) =>
  new Promise<void>((resolve) => {
    const onEvent = () => {
      element.removeEventListener(eventName, onEvent);
      resolve();
    };

    element.addEventListener(eventName, onEvent, { once: true });
  });

const getPreferredRecorderMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return undefined;

  const candidates = ['video/mp4;codecs=h264', 'video/webm;codecs=vp9', 'video/webm'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
};

// Balanced media processing: compressed images and mobile-friendly videos.
export const processMedia = async (
  file: File,
  options: ProcessMediaOptions = {}
): Promise<File> => {
  if (file.type.startsWith('image')) {
    if (file.size / 1024 / 1024 > MAX_IMAGE_MB) {
      alert(`Image too large. Max ${MAX_IMAGE_MB}MB.`);
      throw new Error('Image too large');
    }

    options.onProgress?.(20, 'Optimizing image...');
    return compressImage(file);
  }

  if (file.type.startsWith('video')) {
    if (file.size / 1024 / 1024 > MAX_VIDEO_MB) {
      alert(`Video too large. Max ${MAX_VIDEO_MB}MB.`);
      throw new Error('Video too large');
    }

    options.onProgress?.(8, 'Preparing video...');
    return compressVideo(file, options);
  }

  return file;
};

const compressImage = async (file: File): Promise<File> => {
  const img = document.createElement('img');
  const url = URL.createObjectURL(file);

  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    URL.revokeObjectURL(url);
    return file;
  }

  const maxWidth = 1080;
  const scale = Math.min(1, maxWidth / img.width);

  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.9)
  );

  URL.revokeObjectURL(url);

  if (!blob) return file;

  return new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
};

const compressVideo = async (
  file: File,
  options: ProcessMediaOptions = {}
): Promise<File> => {
  const video = document.createElement('video');
  video.preload = 'auto';
  video.playsInline = true;
  video.muted = true;

  const sourceUrl = URL.createObjectURL(file);
  video.src = sourceUrl;

  let rafId: number | null = null;
  let audioContext: AudioContext | null = null;
  let captureStream: MediaStream | null = null;

  try {
    await waitForMediaEvent(video, 'loadedmetadata');

    const sourceWidth = video.videoWidth || 720;
    const sourceHeight = video.videoHeight || 1280;
    const forcePortrait = options.mobileVideo || sourceHeight >= sourceWidth;
    const targetWidth = forcePortrait ? 720 : 1280;
    const targetHeight = forcePortrait ? 1280 : 720;

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      const fallbackExt = file.name.split('.').pop() || 'mp4';
      return new File([file], file.name.replace(/\.[^/.]+$/, `.${fallbackExt}`), {
        type: file.type,
        lastModified: Date.now(),
      });
    }

    options.onProgress?.(18, 'Compressing video...');

    const renderFrame = () => {
      const sourceAspect = sourceWidth / sourceHeight;
      const targetAspect = targetWidth / targetHeight;

      let sx = 0;
      let sy = 0;
      let sw = sourceWidth;
      let sh = sourceHeight;

      if (sourceAspect > targetAspect) {
        sw = sourceHeight * targetAspect;
        sx = (sourceWidth - sw) / 2;
      } else if (sourceAspect < targetAspect) {
        sh = sourceWidth / targetAspect;
        sy = (sourceHeight - sh) / 2;
      }

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

      if (!video.paused && !video.ended) {
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    const canvasStream = canvas.captureStream(30);
    const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

    try {
      const AudioContextCtor = window.AudioContext || (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

      if (AudioContextCtor) {
        audioContext = new AudioContextCtor();
        const destination = audioContext.createMediaStreamDestination();
        const sourceNode = audioContext.createMediaElementSource(video);
        sourceNode.connect(destination);
        await audioContext.resume().catch(() => undefined);
        tracks.push(...destination.stream.getAudioTracks());
      }
    } catch {
      tracks.push(...file.type.startsWith('video/') ? [] : []);
    }

    captureStream = new MediaStream(tracks);

    const mimeType = getPreferredRecorderMimeType();
    const recorder = mimeType
      ? new MediaRecorder(captureStream, {
          mimeType,
          videoBitsPerSecond: forcePortrait ? 2_500_000 : 3_500_000,
          audioBitsPerSecond: 128_000,
        })
      : new MediaRecorder(captureStream, {
          videoBitsPerSecond: forcePortrait ? 2_500_000 : 3_500_000,
          audioBitsPerSecond: 128_000,
        });

    const chunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    const stopPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error('Video compression failed.'));
      recorder.onstop = () => {
        resolve(
          new Blob(chunks, {
            type: recorder.mimeType || file.type || 'video/webm',
          })
        );
      };
    });

    recorder.start(250);
    await video.play();
    renderFrame();

    await waitForMediaEvent(video, 'ended');

    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }

    recorder.stop();
    const blob = await stopPromise;
    options.onProgress?.(92, 'Video ready for upload.');

    if (!blob.size) {
      return file;
    }

    const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    return new File([blob], `${baseName}.${extension}`, {
      type: blob.type || file.type,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
    }

    if (captureStream) {
      captureStream.getTracks().forEach((track) => track.stop());
    }

    if (audioContext) {
      void audioContext.close().catch(() => undefined);
    }

    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(sourceUrl);
  }
};

export const uploadPostMedia = async (file: File, userId: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `posts/${fileName}`;

  const { error } = await supabase.storage.from('media').upload(filePath, file);

  if (error) {
    console.error('Upload error:', error);
    throw error;
  }

  const { data } = supabase.storage.from('media').getPublicUrl(filePath);

  return data.publicUrl;
};