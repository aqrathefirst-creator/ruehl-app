'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, uploadPostMedia, processMedia } from '@/lib/supabase';

type CreateView = 'camera' | 'gallery' | 'editor';
type FacingMode = 'user' | 'environment';
type MediaKind = 'image' | 'video';
type EditorTool = 'trim' | 'text' | 'filters' | 'sound' | 'genre' | 'cover';

type MediaItem = {
  file: File;
  url: string;
  kind: MediaKind;
};

type TextOverlay = {
  id: string;
  text: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color: string;
  withBackground: boolean;
  fontFamily: string;
  startSec: number;
  endSec: number;
};

type SoundRecord = {
  id: string;
  track_name: string;
  artist_name: string;
  preview_url?: string | null;
  thumbnail_url?: string | null;
};

const RECORDING_MAX_MS = 45_000;
const HOLD_TO_RECORD_MS = 170;
const GENRES = [
  'Fitness',
  'Core',
  'Strength Training',
  'Dance',
  'Lifestyle',
  'Health',
  'Nutrition',
] as const;

const FONT_OPTIONS = [
  'ui-sans-serif, system-ui',
  'Avenir Next, ui-sans-serif, system-ui',
  'Trebuchet MS, ui-sans-serif, system-ui',
  'Georgia, serif',
  'Courier New, monospace',
];

const FILTERS = [
  { name: 'Clean', css: 'none' },
  { name: 'Warm', css: 'saturate(1.12) sepia(0.22) contrast(1.03)' },
  { name: 'Cool', css: 'saturate(0.96) hue-rotate(10deg) contrast(1.06)' },
  { name: 'High Contrast', css: 'contrast(1.35) saturate(1.18)' },
  { name: 'Dark Boost', css: 'brightness(0.88) contrast(1.22) saturate(1.1)' },
] as const;

const getMediaKind = (file: File): MediaKind | null => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
};

const getPreferredRecorderMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return undefined;

  const candidates = ['video/mp4;codecs=h264', 'video/webm;codecs=vp9', 'video/webm'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
};

const parseHashtags = (caption: string) => {
  const matches = caption.match(/#[a-zA-Z0-9_]+/g) || [];
  return [...new Set(matches.map((tag) => tag.toLowerCase()))];
};

const parseMentions = (caption: string) => {
  const matches = caption.match(/@[a-zA-Z0-9_\.]+/g) || [];
  return [...new Set(matches.map((mention) => mention.toLowerCase()))];
};

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const type = searchParams.get('type');
  const isPowr = type === 'powr';

  const [view, setView] = useState<CreateView>(isPowr ? 'editor' : 'camera');
  const [activeTool, setActiveTool] = useState<EditorTool>('filters');

  const [caption, setCaption] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const [trackName, setTrackName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [sounds, setSounds] = useState<SoundRecord[]>([]);
  const [showSounds, setShowSounds] = useState(false);
  const [soundSearch, setSoundSearch] = useState('');
  const [selectedSound, setSelectedSound] = useState<SoundRecord | null>(null);

  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [galleryItems, setGalleryItems] = useState<MediaItem[]>([]);

  const [requestingPermissions, setRequestingPermissions] = useState(!isPowr);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<FacingMode>('environment');

  const [recording, setRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [clipSegments, setClipSegments] = useState<number[]>([]);
  const [totalRecordedMs, setTotalRecordedMs] = useState(0);

  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStartSec, setTrimStartSec] = useState(0);
  const [trimEndSec, setTrimEndSec] = useState(0);
  const [scrubSec, setScrubSec] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [coverTimeSec, setCoverTimeSec] = useState(0);

  const [selectedFilter, setSelectedFilter] = useState<(typeof FILTERS)[number]['name']>('Clean');

  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState('');

  const [originalAudioVolume, setOriginalAudioVolume] = useState(1);
  const [addedSoundVolume, setAddedSoundVolume] = useState(0.8);

  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const editorVideoRef = useRef<HTMLVideoElement | null>(null);
  const hiddenFrameVideoRef = useRef<HTMLVideoElement | null>(null);
  const soundPreviewRef = useRef<HTMLAudioElement | null>(null);

  const cameraStreamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const holdTimeoutRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const activeClipStartRef = useRef<number | null>(null);

  const progressRafRef = useRef<number | null>(null);
  const selectedMediaUrlRef = useRef<string | null>(null);
  const galleryUrlsRef = useRef<string[]>([]);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const microphoneAllowedRef = useRef(false);

  const dragStateRef = useRef<{
    id: string;
    pointerId: number;
    dx: number;
    dy: number;
  } | null>(null);

  const trimmedVideoUrlRef = useRef<string | null>(null);

  const selectedFilterCss = useMemo(() => {
    return FILTERS.find((filter) => filter.name === selectedFilter)?.css ?? 'none';
  }, [selectedFilter]);

  const progressCircle = useMemo(() => {
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - circumference * recordingProgress;
    return { radius, circumference, offset };
  }, [recordingProgress]);

  const editorToolbar = useMemo(
    () => [
      { id: 'trim', label: 'Trim' },
      { id: 'text', label: 'Text' },
      { id: 'filters', label: 'Filters' },
      { id: 'sound', label: 'Sound' },
      { id: 'genre', label: 'Genre' },
      { id: 'cover', label: 'Cover' },
    ] as const,
    []
  );

  const activeText = useMemo(
    () => textOverlays.find((overlay) => overlay.id === activeTextId) || null,
    [activeTextId, textOverlays]
  );

  const visibleSounds = useMemo(() => {
    const query = soundSearch.trim().toLowerCase();
    if (!query) return sounds;
    return sounds.filter((sound) => {
      const track = sound.track_name?.toLowerCase() || '';
      const artist = sound.artist_name?.toLowerCase() || '';
      return track.includes(query) || artist.includes(query);
    });
  }, [soundSearch, sounds]);

  const clearError = () => setError(null);

  const revokeSelectedMediaUrl = () => {
    if (selectedMediaUrlRef.current) {
      URL.revokeObjectURL(selectedMediaUrlRef.current);
      selectedMediaUrlRef.current = null;
    }
  };

  const revokeGalleryUrls = () => {
    galleryUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    galleryUrlsRef.current = [];
  };

  const revokeTrimmedUrl = () => {
    if (trimmedVideoUrlRef.current) {
      URL.revokeObjectURL(trimmedVideoUrlRef.current);
      trimmedVideoUrlRef.current = null;
    }
  };

  const stopCameraStream = () => {
    if (!cameraStreamRef.current) return;
    cameraStreamRef.current.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
  };

  const stopProgressLoop = () => {
    if (progressRafRef.current) {
      cancelAnimationFrame(progressRafRef.current);
      progressRafRef.current = null;
    }
  };

  const updateRecordingProgress = () => {
    stopProgressLoop();

    const tick = () => {
      const liveSegmentMs = activeClipStartRef.current ? performance.now() - activeClipStartRef.current : 0;
      const next = Math.min((totalRecordedMs + liveSegmentMs) / RECORDING_MAX_MS, 1);
      setRecordingProgress(next);

      if (next >= 1) {
        finalizeRecordedVideo().catch(() => undefined);
        return;
      }

      progressRafRef.current = requestAnimationFrame(tick);
    };

    progressRafRef.current = requestAnimationFrame(tick);
  };

  const startCameraStream = async (facing: FacingMode, withAudio: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facing },
      audio: withAudio,
    });

    stopCameraStream();
    cameraStreamRef.current = stream;

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = stream;
      await cameraVideoRef.current.play().catch(() => undefined);
    }
  };

  const initializePermissions = async () => {
    if (isPowr) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraDenied(true);
      setMicDenied(true);
      setRequestingPermissions(false);
      return;
    }

    setRequestingPermissions(true);

    try {
      await startCameraStream(cameraFacing, false);
      setCameraDenied(false);
    } catch {
      setCameraDenied(true);
      setMicDenied(true);
      setRequestingPermissions(false);
      return;
    }

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.getTracks().forEach((track) => track.stop());
      microphoneAllowedRef.current = true;
      setMicDenied(false);
    } catch {
      microphoneAllowedRef.current = false;
      setMicDenied(true);
    }

    if (microphoneAllowedRef.current) {
      try {
        await startCameraStream(cameraFacing, true);
      } catch {
        setMicDenied(true);
      }
    }

    setRequestingPermissions(false);
  };

  const setSelectedFromFile = (file: File) => {
    const kind = getMediaKind(file);
    if (!kind) {
      setError('Unsupported media format. Please use image or video.');
      return;
    }

    clearError();
    revokeSelectedMediaUrl();
    revokeTrimmedUrl();

    const nextUrl = URL.createObjectURL(file);
    selectedMediaUrlRef.current = nextUrl;

    setSelectedMedia({ file, url: nextUrl, kind });
    setView('editor');

    if (kind === 'image') {
      setVideoDuration(0);
      setTrimStartSec(0);
      setTrimEndSec(0);
      setScrubSec(0);
      setCoverTimeSec(0);
    }
  };

  const loadSounds = async () => {
    const { data } = await supabase
      .from('sounds')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(60);

    setSounds((data || []) as SoundRecord[]);
  };

  useEffect(() => {
    void loadSounds();
  }, []);

  useEffect(() => {
    void initializePermissions();

    return () => {
      stopProgressLoop();
      if (holdTimeoutRef.current) window.clearTimeout(holdTimeoutRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      stopCameraStream();
      revokeSelectedMediaUrl();
      revokeGalleryUrls();
      revokeTrimmedUrl();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedMedia || selectedMedia.kind !== 'video') return;

    const el = editorVideoRef.current;
    if (!el) return;

    const onLoaded = () => {
      const duration = Number.isFinite(el.duration) ? el.duration : 0;
      setVideoDuration(duration);
      setTrimStartSec(0);
      setTrimEndSec(duration || 0);
      setScrubSec(0);
      setCurrentTimeSec(0);
      setCoverTimeSec(0);
    };

    el.addEventListener('loadedmetadata', onLoaded);
    return () => el.removeEventListener('loadedmetadata', onLoaded);
  }, [selectedMedia]);

  useEffect(() => {
    const el = editorVideoRef.current;
    if (!el || !selectedMedia || selectedMedia.kind !== 'video') return;

    const onTimeUpdate = () => {
      const current = el.currentTime;
      if (trimEndSec > trimStartSec && current >= trimEndSec) {
        el.currentTime = trimStartSec;
        void el.play();
      }
      setCurrentTimeSec(el.currentTime);
      setScrubSec(el.currentTime);
    };

    const onPlay = () => {
      if (selectedSound?.preview_url && soundPreviewRef.current) {
        soundPreviewRef.current.currentTime = 0;
        void soundPreviewRef.current.play().catch(() => undefined);
      }
    };

    const onPause = () => {
      soundPreviewRef.current?.pause();
    };

    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [selectedMedia, selectedSound, trimEndSec, trimStartSec]);

  useEffect(() => {
    if (editorVideoRef.current) {
      editorVideoRef.current.volume = originalAudioVolume;
      editorVideoRef.current.muted = originalAudioVolume <= 0.01;
    }
  }, [originalAudioVolume]);

  useEffect(() => {
    if (!soundPreviewRef.current) return;
    soundPreviewRef.current.volume = addedSoundVolume;
  }, [addedSoundVolume]);

  const resetVideoSession = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    mediaRecorderRef.current = null;
    recorderChunksRef.current = [];
    activeClipStartRef.current = null;
    setClipSegments([]);
    setTotalRecordedMs(0);
    setRecording(false);
    setRecordingProgress(0);
  };

  const beginRecordingIfNeeded = () => {
    if (!cameraStreamRef.current) return false;
    if (typeof MediaRecorder === 'undefined') {
      setError('Media recording is not available on this device.');
      return false;
    }

    if (!mediaRecorderRef.current) {
      const mimeType = getPreferredRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(cameraStreamRef.current, { mimeType })
        : new MediaRecorder(cameraStreamRef.current);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recorderChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        setRecording(false);
        activeClipStartRef.current = null;
        stopProgressLoop();

        if (!recorderChunksRef.current.length) return;

        const blob = new Blob(recorderChunksRef.current, {
          type: recorder.mimeType || 'video/webm',
        });

        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([blob], `clip-${Date.now()}.${ext}`, {
          type: blob.type || 'video/webm',
        });

        setSelectedFromFile(file);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(120);
      recorder.pause();
    }

    return true;
  };

  const startClipRecording = () => {
    if (cameraDenied || requestingPermissions || isPowr) return;
    if (!beginRecordingIfNeeded()) return;

    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    clearError();

    if (recorder.state === 'paused') {
      recorder.resume();
    }

    if (recorder.state === 'inactive') {
      recorder.start(120);
    }

    activeClipStartRef.current = performance.now();
    setRecording(true);
    if (navigator.vibrate) navigator.vibrate(8);
    updateRecordingProgress();
  };

  const pauseClipRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;

    recorder.pause();

    const startedAt = activeClipStartRef.current;
    if (startedAt) {
      const segmentMs = Math.min(performance.now() - startedAt, RECORDING_MAX_MS - totalRecordedMs);
      const rounded = Math.max(0, Math.round(segmentMs));
      setClipSegments((prev) => [...prev, rounded]);
      setTotalRecordedMs((prev) => {
        const next = Math.min(prev + rounded, RECORDING_MAX_MS);
        if (next >= RECORDING_MAX_MS) {
          void finalizeRecordedVideo();
        }
        return next;
      });
    }

    activeClipStartRef.current = null;
    setRecording(false);
    if (navigator.vibrate) navigator.vibrate(10);
    updateRecordingProgress();
  };

  const finalizeRecordedVideo = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state === 'recording') {
      pauseClipRecording();
    }

    if (recorder.state === 'paused') {
      recorder.stop();
      mediaRecorderRef.current = null;
    }
  };

  const capturePhoto = async () => {
    if (!cameraVideoRef.current || cameraDenied) return;

    if (clipSegments.length > 0 || totalRecordedMs > 0) {
      setError('Finish your video clips first, then capture a photo.');
      return;
    }

    const video = cameraVideoRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      setError('Camera is still loading. Try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setError('Unable to capture photo right now.');
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.95);
    });

    if (!blob) {
      setError('Photo capture failed. Please try again.');
      return;
    }

    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setSelectedFromFile(file);
  };

  const onCapturePointerDown = () => {
    if (cameraDenied || requestingPermissions || isPowr) return;

    holdTimeoutRef.current = window.setTimeout(() => {
      startClipRecording();
      holdTimeoutRef.current = null;
    }, HOLD_TO_RECORD_MS);
  };

  const onCapturePointerUp = async () => {
    if (holdTimeoutRef.current) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
      await capturePhoto();
      return;
    }

    if (recording) {
      pauseClipRecording();
    }
  };

  const onCapturePointerCancel = () => {
    if (holdTimeoutRef.current) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (recording) {
      pauseClipRecording();
    }
  };

  const openGallery = () => {
    clearError();
    galleryInputRef.current?.click();
  };

  const onGalleryInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files || []);
    if (!incoming.length) return;

    clearError();
    revokeGalleryUrls();

    const nextItems: MediaItem[] = incoming
      .map((file) => {
        const kind = getMediaKind(file);
        if (!kind) return null;

        const url = URL.createObjectURL(file);
        galleryUrlsRef.current.push(url);
        return { file, url, kind };
      })
      .filter((item): item is MediaItem => Boolean(item));

    if (!nextItems.length) {
      setError('No supported media selected.');
      return;
    }

    setGalleryItems(nextItems);
    setView('gallery');
  };

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (view !== 'camera' || isPowr) return;

    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (view !== 'camera' || isPowr) return;
    if (!touchStartRef.current) return;

    const touch = event.changedTouches[0];
    const deltaY = touchStartRef.current.y - touch.clientY;
    const deltaX = Math.abs(touchStartRef.current.x - touch.clientX);

    touchStartRef.current = null;

    if (deltaY > 72 && deltaX < 90) {
      openGallery();
    }
  };

  const flipCamera = async () => {
    if (cameraDenied || requestingPermissions || isPowr) return;

    const nextFacing: FacingMode = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);

    try {
      await startCameraStream(nextFacing, microphoneAllowedRef.current);
    } catch {
      setError('Unable to switch camera.');
    }
  };

  const onScrubChange = (value: number) => {
    setScrubSec(value);
    if (editorVideoRef.current) {
      editorVideoRef.current.currentTime = value;
      setCurrentTimeSec(value);
    }
  };

  const addTextOverlay = () => {
    if (!textDraft.trim()) return;

    const baseEnd = trimEndSec > 0 ? trimEndSec : Math.max(videoDuration, 5);
    const id = `txt-${Date.now()}`;
    const overlay: TextOverlay = {
      id,
      text: textDraft.trim(),
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
      color: '#ffffff',
      withBackground: true,
      fontFamily: FONT_OPTIONS[0],
      startSec: 0,
      endSec: baseEnd,
    };

    setTextOverlays((prev) => [...prev, overlay]);
    setActiveTextId(id);
    setTextDraft('');
    setActiveTool('text');
  };

  const updateActiveOverlay = (patch: Partial<TextOverlay>) => {
    if (!activeTextId) return;
    setTextOverlays((prev) => prev.map((item) => (item.id === activeTextId ? { ...item, ...patch } : item)));
  };

  const deleteActiveOverlay = () => {
    if (!activeTextId) return;
    setTextOverlays((prev) => prev.filter((item) => item.id !== activeTextId));
    setActiveTextId(null);
  };

  const onOverlayPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    overlay: TextOverlay,
    container: HTMLDivElement | null
  ) => {
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const targetX = (overlay.x / 100) * rect.width;
    const targetY = (overlay.y / 100) * rect.height;

    dragStateRef.current = {
      id: overlay.id,
      pointerId: event.pointerId,
      dx: event.clientX - targetX,
      dy: event.clientY - targetY,
    };

    setActiveTextId(overlay.id);
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onOverlayPointerMove = (event: React.PointerEvent<HTMLDivElement>, container: HTMLDivElement | null) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !container) return;

    const rect = container.getBoundingClientRect();
    const x = ((event.clientX - drag.dx) / rect.width) * 100;
    const y = ((event.clientY - drag.dy) / rect.height) * 100;

    const clampedX = Math.max(6, Math.min(94, x));
    const clampedY = Math.max(6, Math.min(94, y));

    setTextOverlays((prev) =>
      prev.map((item) =>
        item.id === drag.id
          ? {
              ...item,
              x: clampedX,
              y: clampedY,
            }
          : item
      )
    );
  };

  const onOverlayPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
    }
  };

  const buildTrimmedVideo = async (sourceFile: File) => {
    if (sourceFile.type.startsWith('image/')) return sourceFile;

    const hasTrim = trimEndSec > trimStartSec && trimEndSec - trimStartSec < videoDuration - 0.08;
    if (!hasTrim || trimEndSec <= trimStartSec) return sourceFile;

    if (!hiddenFrameVideoRef.current) return sourceFile;
    if (!(hiddenFrameVideoRef.current as any).captureStream) return sourceFile;

    const hiddenVideo = hiddenFrameVideoRef.current;
    const sourceUrl = URL.createObjectURL(sourceFile);

    const waitForEvent = (el: HTMLVideoElement, name: string) =>
      new Promise<void>((resolve) => {
        const handler = () => {
          el.removeEventListener(name, handler);
          resolve();
        };
        el.addEventListener(name, handler);
      });

    try {
      hiddenVideo.src = sourceUrl;
      hiddenVideo.muted = false;
      hiddenVideo.volume = originalAudioVolume;
      await waitForEvent(hiddenVideo, 'loadedmetadata');

      hiddenVideo.currentTime = trimStartSec;
      await waitForEvent(hiddenVideo, 'seeked');

      const capturedStream: MediaStream = (hiddenVideo as any).captureStream();
      const mimeType = getPreferredRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(capturedStream, { mimeType })
        : new MediaRecorder(capturedStream);

      const pieces: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) pieces.push(event.data);
      };

      const stopPromise = new Promise<File>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(pieces, {
            type: recorder.mimeType || sourceFile.type || 'video/webm',
          });

          const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
          const nextFile = new File([blob], `trimmed-${Date.now()}.${ext}`, { type: blob.type });
          resolve(nextFile);
        };
      });

      recorder.start(120);
      await hiddenVideo.play();

      await new Promise<void>((resolve) => {
        const maxMs = (trimEndSec - trimStartSec) * 1000;
        const timeoutId = window.setTimeout(() => {
          resolve();
        }, maxMs);

        const onTimeUpdate = () => {
          if (hiddenVideo.currentTime >= trimEndSec) {
            window.clearTimeout(timeoutId);
            hiddenVideo.removeEventListener('timeupdate', onTimeUpdate);
            resolve();
          }
        };

        hiddenVideo.addEventListener('timeupdate', onTimeUpdate);
      });

      hiddenVideo.pause();
      recorder.stop();

      const trimmed = await stopPromise;
      return trimmed;
    } catch {
      return sourceFile;
    } finally {
      URL.revokeObjectURL(sourceUrl);
      hiddenVideo.removeAttribute('src');
      hiddenVideo.load();
    }
  };

  const extractCoverFrame = async (sourceFile: File, atSec: number) => {
    if (!sourceFile.type.startsWith('video/')) return null;

    const video = document.createElement('video');
    video.preload = 'auto';
    video.playsInline = true;

    const sourceUrl = URL.createObjectURL(sourceFile);
    video.src = sourceUrl;

    const waitForEvent = (name: string) =>
      new Promise<void>((resolve) => {
        const handler = () => {
          video.removeEventListener(name, handler);
          resolve();
        };
        video.addEventListener(name, handler);
      });

    try {
      await waitForEvent('loadedmetadata');
      video.currentTime = Math.max(0, Math.min(video.duration || atSec, atSec));
      await waitForEvent('seeked');

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.92);
      });

      if (!blob) return null;
      return new File([blob], `cover-${Date.now()}.jpg`, { type: 'image/jpeg' });
    } finally {
      URL.revokeObjectURL(sourceUrl);
      video.removeAttribute('src');
      video.load();
    }
  };

  const insertPostWithFallback = async (payload: Record<string, any>) => {
    const candidate = { ...payload };

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const { error: insertError } = await supabase.from('posts').insert(candidate);

      if (!insertError) return;

      const message = insertError.message || '';
      const missingColumnMatch = message.match(/column\s+"([^"]+)"/i);

      if (missingColumnMatch?.[1]) {
        const column = missingColumnMatch[1];
        if (column in candidate) {
          delete candidate[column];
          continue;
        }
      }

      throw insertError;
    }

    throw new Error('Unable to insert post payload after fallback attempts.');
  };

  const handlePost = async () => {
    if (posting) return;

    clearError();

    if (!selectedGenre) {
      setError('Select a genre before posting.');
      setActiveTool('genre');
      return;
    }

    if (!selectedMedia && !caption.trim()) {
      setError('Add media or caption before posting.');
      return;
    }

    setPosting(true);
    setSuccess(false);
    setProgress(8);

    const tempPost = {
      id: `temp-${Date.now()}`,
      content: caption,
      media_url: selectedMedia?.url || null,
      created_at: new Date().toISOString(),
      user_id: 'temp-user',
      track_name: trackName,
      artist_name: artistName,
      genre: selectedGenre,
      is_temp: true,
    };

    localStorage.setItem('optimistic_post', JSON.stringify(tempPost));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Please sign in to post.');
        setPosting(false);
        return;
      }

      let mediaUrl: string | null = null;
      let thumbnailUrl: string | null = null;

      if (selectedMedia) {
        setProgress(30);

        const fileForUpload = await buildTrimmedVideo(selectedMedia.file);
        const finalFile = await processMedia(fileForUpload);
        setProgress(52);
        mediaUrl = await uploadPostMedia(finalFile, user.id);

        if (selectedMedia.kind === 'video') {
          const coverFile = await extractCoverFrame(fileForUpload, coverTimeSec || trimStartSec || 0);
          if (coverFile) {
            const processedCover = await processMedia(coverFile);
            thumbnailUrl = await uploadPostMedia(processedCover, user.id);
          }
        }
      }

      let soundId: string | null = null;

      if (selectedSound || trackName) {
        const requestedTrack = selectedSound?.track_name || trackName;
        const requestedArtist = selectedSound?.artist_name || artistName;

        const { data: existing } = await supabase
          .from('sounds')
          .select('*')
          .eq('track_name', requestedTrack)
          .eq('artist_name', requestedArtist)
          .single();

        if (existing) {
          soundId = existing.id;
          await supabase
            .from('sounds')
            .update({ usage_count: (existing.usage_count || 0) + 1 })
            .eq('id', existing.id);
        } else {
          const { data: createdSound } = await supabase
            .from('sounds')
            .insert({
              track_name: requestedTrack,
              artist_name: requestedArtist,
              usage_count: 1,
              thumbnail_url: selectedSound?.thumbnail_url || null,
            })
            .select()
            .single();

          soundId = createdSound?.id || null;
        }
      }

      setProgress(78);

      const hashtags = parseHashtags(caption);
      const mentions = parseMentions(caption);

      const payload: Record<string, any> = {
        content: caption,
        user_id: user.id,
        media_url: isPowr ? null : mediaUrl,
        thumbnail_url: thumbnailUrl,
        track_name: selectedSound?.track_name || trackName,
        artist_name: selectedSound?.artist_name || artistName,
        sound_id: soundId,
        genre: selectedGenre,
        hashtags,
        mentions,
        filter_name: selectedFilter,
        text_overlays: textOverlays,
        trim_start_sec: selectedMedia?.kind === 'video' ? trimStartSec : null,
        trim_end_sec: selectedMedia?.kind === 'video' ? trimEndSec : null,
        cover_time_sec: selectedMedia?.kind === 'video' ? coverTimeSec : null,
        original_audio_volume: selectedMedia?.kind === 'video' ? originalAudioVolume : null,
        sound_audio_volume: selectedMedia?.kind === 'video' ? addedSoundVolume : null,
        is_multi_clip: clipSegments.length > 1,
        clip_segments_ms: clipSegments.length ? clipSegments : null,
      };

      await insertPostWithFallback(payload);

      setProgress(100);
      setSuccess(true);

      window.setTimeout(() => {
        localStorage.removeItem('optimistic_post');
      }, 900);

      window.setTimeout(() => {
        router.push('/now');
      }, 820);
    } catch (postError: any) {
      setError(postError?.message || 'Unable to publish post right now.');
      setPosting(false);
    }
  };

  const cameraUnavailable = cameraDenied || isPowr;

  return (
    <div
      className="w-full min-h-screen bg-black flex justify-center"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="w-full max-w-[430px] h-[100dvh] relative bg-black text-white overflow-hidden">
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={onGalleryInputChange}
        />

        <video ref={hiddenFrameVideoRef} className="hidden" playsInline />

        {view === 'camera' && (
          <>
            <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 pt-5 pb-3">
              <button
                onClick={() => router.back()}
                className="px-3 py-1.5 rounded-full bg-black/40 border border-white/15 text-sm"
              >
                Cancel
              </button>

              {!cameraUnavailable ? (
                <button
                  onClick={flipCamera}
                  className="px-3 py-1.5 rounded-full bg-black/40 border border-white/15 text-sm"
                >
                  Flip
                </button>
              ) : (
                <div className="px-3 py-1.5 rounded-full bg-black/30 border border-white/10 text-xs text-gray-400">
                  Gallery Mode
                </div>
              )}
            </div>

            {!cameraUnavailable && !requestingPermissions && (
              <>
                <video
                  ref={cameraVideoRef}
                  className="absolute inset-0 h-full w-full object-cover"
                  autoPlay
                  playsInline
                  muted={micDenied}
                />

                <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/60" />

                <div className="absolute top-16 left-4 right-4 z-30">
                  <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100"
                      style={{ width: `${Math.min((totalRecordedMs / RECORDING_MAX_MS) * 100 + (recording ? ((performance.now() - (activeClipStartRef.current || performance.now())) / RECORDING_MAX_MS) * 100 : 0), 100)}%` }}
                    />
                  </div>

                  {clipSegments.length > 0 && (
                    <div className="mt-2 flex gap-1">
                      {clipSegments.map((segment, index) => (
                        <div
                          key={`${segment}-${index}`}
                          className="h-1 rounded-full bg-pink-400/85"
                          style={{ width: `${(segment / RECORDING_MAX_MS) * 100}%` }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="absolute bottom-28 left-0 right-0 z-30 text-center text-xs text-white/80">
                  Tap photo. Hold to record clips. Swipe up for gallery.
                </div>

                {micDenied && (
                  <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-30 rounded-full bg-black/55 border border-white/15 px-3 py-1 text-[11px] text-white/85">
                    Microphone denied. Video records without audio.
                  </div>
                )}

                <div className="absolute bottom-10 left-0 right-0 z-30 flex items-center justify-center gap-4">
                  {clipSegments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        void finalizeRecordedVideo();
                      }}
                      className="px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-xs"
                    >
                      Next
                    </button>
                  )}

                  <div className={`relative h-24 w-24 ${recording ? 'drop-shadow-[0_0_16px_rgba(236,72,153,0.65)]' : ''}`}>
                    <svg className="absolute inset-0 h-24 w-24 -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
                      <circle cx="40" cy="40" r={progressCircle.radius} stroke="rgba(255,255,255,0.28)" strokeWidth="5" fill="none" />
                      <circle
                        cx="40"
                        cy="40"
                        r={progressCircle.radius}
                        stroke="url(#recordRingGradient)"
                        strokeWidth="5"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={progressCircle.circumference}
                        strokeDashoffset={progressCircle.offset}
                      />
                      <defs>
                        <linearGradient id="recordRingGradient" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                    </svg>

                    <button
                      type="button"
                      onPointerDown={onCapturePointerDown}
                      onPointerUp={onCapturePointerUp}
                      onPointerLeave={onCapturePointerCancel}
                      onPointerCancel={onCapturePointerCancel}
                      className={`absolute inset-[12px] rounded-full border border-white/30 transition-all touch-none ${
                        recording
                          ? 'bg-gradient-to-br from-fuchsia-500 to-purple-500 scale-[0.93]'
                          : 'bg-white'
                      }`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={openGallery}
                    className="px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-xs"
                  >
                    Gallery
                  </button>
                </div>
              </>
            )}

            {(cameraUnavailable || requestingPermissions) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <div className="w-20 h-20 rounded-full bg-white/10 border border-white/15 mb-5" />
                <h2 className="text-xl font-semibold mb-2">
                  {requestingPermissions ? 'Preparing camera...' : 'Camera unavailable'}
                </h2>
                <p className="text-sm text-gray-400 max-w-[320px] mb-6">
                  {requestingPermissions
                    ? 'Requesting camera first, then microphone to keep capture native.'
                    : 'Camera permission was denied. Swipe up or use gallery to keep creating.'}
                </p>

                <button
                  type="button"
                  onClick={openGallery}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-semibold"
                >
                  Open Gallery
                </button>

                {!requestingPermissions && (
                  <button
                    type="button"
                    onClick={() => {
                      setCameraDenied(false);
                      void initializePermissions();
                    }}
                    className="mt-3 px-5 py-2 rounded-xl bg-white/10 border border-white/20 text-xs"
                  >
                    Try camera again
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {view === 'gallery' && (
          <div className="absolute inset-0 z-40 pt-20 px-4 pb-6 bg-black">
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-5 pb-3 bg-gradient-to-b from-black to-transparent">
              <button
                onClick={() => setView('camera')}
                className="px-3 py-1.5 rounded-full bg-black/40 border border-white/15 text-sm"
              >
                Back
              </button>
              <button
                onClick={openGallery}
                className="px-3 py-1.5 rounded-full bg-black/40 border border-white/15 text-sm"
              >
                Recent
              </button>
            </div>

            {galleryItems.length === 0 ? (
              <div className="h-[55vh] mt-16 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-sm text-gray-400 text-center px-6">
                Swipe up or tap Recent to load media.
              </div>
            ) : (
              <div className="mt-16 grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] p-1.5 max-h-[74vh] overflow-y-auto">
                {galleryItems.map((item, index) => (
                  <button
                    key={`${item.url}-${index}`}
                    onClick={() => setSelectedFromFile(item.file)}
                    className="relative aspect-square overflow-hidden rounded-md"
                  >
                    {item.kind === 'image' ? (
                      <img src={item.url} className="h-full w-full object-cover" alt={`Gallery ${index + 1}`} />
                    ) : (
                      <video src={item.url} className="h-full w-full object-cover" muted playsInline />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'editor' && (
          <div className="absolute inset-0 z-40 bg-black">
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-5 pb-3 bg-gradient-to-b from-black to-transparent">
              <button
                type="button"
                onClick={() => {
                  if (isPowr) {
                    router.back();
                    return;
                  }
                  resetVideoSession();
                  setSelectedMedia(null);
                  setView('camera');
                }}
                className="px-3 py-1.5 rounded-full bg-black/45 border border-white/15 text-sm"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handlePost}
                disabled={posting}
                className="px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-semibold disabled:opacity-60"
              >
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>

            <div className="absolute top-0 left-0 right-0 bottom-[265px]">
              <div
                className="relative h-full w-full"
                onPointerMove={(event) => onOverlayPointerMove(event, event.currentTarget)}
                onPointerUp={onOverlayPointerUp}
                onPointerCancel={onOverlayPointerUp}
              >
                {selectedMedia ? (
                  selectedMedia.kind === 'image' ? (
                    <img
                      src={selectedMedia.url}
                      alt="Editor preview"
                      className="h-full w-full object-contain"
                      style={{ filter: selectedFilterCss }}
                    />
                  ) : (
                    <video
                      ref={editorVideoRef}
                      src={selectedMedia.url}
                      className="h-full w-full object-contain"
                      autoPlay
                      loop
                      playsInline
                      controls={activeTool === 'trim'}
                      style={{ filter: selectedFilterCss }}
                    />
                  )
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm text-gray-400">
                    Write your post and select a genre.
                  </div>
                )}

                {textOverlays.map((overlay) => {
                  const visibleForVideo =
                    !selectedMedia ||
                    selectedMedia.kind !== 'video' ||
                    (currentTimeSec >= overlay.startSec && currentTimeSec <= overlay.endSec);

                  if (!visibleForVideo) return null;

                  return (
                    <div
                      key={overlay.id}
                      onPointerDown={(event) => onOverlayPointerDown(event, overlay, event.currentTarget.parentElement as HTMLDivElement)}
                      className={`absolute px-2 py-1 rounded-md cursor-move select-none ${
                        activeTextId === overlay.id ? 'ring-2 ring-pink-400' : ''
                      }`}
                      style={{
                        left: `${overlay.x}%`,
                        top: `${overlay.y}%`,
                        transform: `translate(-50%, -50%) scale(${overlay.scale}) rotate(${overlay.rotation}deg)`,
                        color: overlay.color,
                        background: overlay.withBackground ? 'rgba(0,0,0,0.55)' : 'transparent',
                        fontFamily: overlay.fontFamily,
                        fontWeight: 700,
                      }}
                    >
                      {overlay.text}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="absolute left-0 right-0 bottom-[210px] px-4">
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder={isPowr ? 'Share your thoughts... Use #hashtags and @mentions' : 'Write caption... #hashtags @mentions'}
                className="w-full bg-white/[0.06] border border-white/20 rounded-xl p-3 text-sm min-h-[74px]"
              />
            </div>

            <div className="absolute left-0 right-0 bottom-[162px] px-4">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {editorToolbar.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs border ${
                      activeTool === tool.id
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-transparent'
                        : 'bg-white/10 border-white/20'
                    }`}
                  >
                    {tool.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="absolute left-0 right-0 bottom-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent border-t border-white/10 min-h-[162px]">
              {activeTool === 'trim' && selectedMedia?.kind === 'video' && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-300">Trim start/end and scrub preview</div>
                  <div className="text-[11px] text-gray-400">
                    {trimStartSec.toFixed(1)}s - {trimEndSec.toFixed(1)}s
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={videoDuration || 1}
                    step={0.1}
                    value={trimStartSec}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (value >= trimEndSec) return;
                      setTrimStartSec(value);
                      if (editorVideoRef.current) editorVideoRef.current.currentTime = value;
                    }}
                    className="w-full"
                  />
                  <input
                    type="range"
                    min={0}
                    max={videoDuration || 1}
                    step={0.1}
                    value={trimEndSec}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (value <= trimStartSec) return;
                      setTrimEndSec(value);
                    }}
                    className="w-full"
                  />
                  <input
                    type="range"
                    min={trimStartSec}
                    max={Math.max(trimEndSec, trimStartSec + 0.1)}
                    step={0.1}
                    value={scrubSec}
                    onChange={(event) => onScrubChange(Number(event.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              {activeTool === 'text' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={textDraft}
                      onChange={(event) => setTextDraft(event.target.value)}
                      placeholder="Add text overlay"
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      onClick={addTextOverlay}
                      className="px-3 py-2 rounded-lg bg-white/15 border border-white/20 text-sm"
                    >
                      Add
                    </button>
                  </div>

                  {activeText && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <input
                        type="color"
                        value={activeText.color}
                        onChange={(event) => updateActiveOverlay({ color: event.target.value })}
                        className="w-full h-9 rounded bg-transparent"
                      />
                      <select
                        value={activeText.fontFamily}
                        onChange={(event) => updateActiveOverlay({ fontFamily: event.target.value })}
                        className="bg-white/10 border border-white/20 rounded px-2"
                      >
                        {FONT_OPTIONS.map((font) => (
                          <option key={font} value={font}>
                            {font.split(',')[0]}
                          </option>
                        ))}
                      </select>

                      <label className="col-span-2">Scale</label>
                      <input
                        type="range"
                        min={0.6}
                        max={2.2}
                        step={0.05}
                        value={activeText.scale}
                        onChange={(event) => updateActiveOverlay({ scale: Number(event.target.value) })}
                        className="col-span-2"
                      />

                      <label className="col-span-2">Rotate</label>
                      <input
                        type="range"
                        min={-45}
                        max={45}
                        step={1}
                        value={activeText.rotation}
                        onChange={(event) => updateActiveOverlay({ rotation: Number(event.target.value) })}
                        className="col-span-2"
                      />

                      {selectedMedia?.kind === 'video' && (
                        <>
                          <label>Show from</label>
                          <label>Hide at</label>
                          <input
                            type="number"
                            min={0}
                            max={trimEndSec || videoDuration || 1}
                            step={0.1}
                            value={activeText.startSec}
                            onChange={(event) =>
                              updateActiveOverlay({
                                startSec: Math.max(0, Math.min(Number(event.target.value), activeText.endSec)),
                              })
                            }
                            className="bg-white/10 border border-white/20 rounded px-2 py-1"
                          />
                          <input
                            type="number"
                            min={activeText.startSec}
                            max={trimEndSec || videoDuration || 1}
                            step={0.1}
                            value={activeText.endSec}
                            onChange={(event) =>
                              updateActiveOverlay({
                                endSec: Math.max(activeText.startSec, Number(event.target.value)),
                              })
                            }
                            className="bg-white/10 border border-white/20 rounded px-2 py-1"
                          />
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => updateActiveOverlay({ withBackground: !activeText.withBackground })}
                        className="col-span-1 rounded-lg bg-white/12 border border-white/20 py-1.5"
                      >
                        Highlight
                      </button>
                      <button
                        type="button"
                        onClick={deleteActiveOverlay}
                        className="col-span-1 rounded-lg bg-red-500/20 border border-red-500/40 py-1.5"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTool === 'filters' && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {FILTERS.map((filter) => (
                    <button
                      key={filter.name}
                      onClick={() => setSelectedFilter(filter.name)}
                      className={`shrink-0 px-3 py-2 rounded-lg text-xs border ${
                        selectedFilter === filter.name
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-transparent'
                          : 'bg-white/10 border-white/20'
                      }`}
                    >
                      {filter.name}
                    </button>
                  ))}
                </div>
              )}

              {activeTool === 'sound' && (
                <div className="space-y-2 text-xs">
                  <button
                    onClick={() => setShowSounds(true)}
                    className="px-3 py-1.5 rounded-full bg-white/15 border border-white/20"
                  >
                    {selectedSound ? `${selectedSound.track_name} - ${selectedSound.artist_name}` : 'Add Sound'}
                  </button>
                  <label className="block">Original audio</label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={originalAudioVolume}
                    onChange={(event) => setOriginalAudioVolume(Number(event.target.value))}
                    className="w-full"
                  />
                  <label className="block">Added sound</label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={addedSoundVolume}
                    onChange={(event) => setAddedSoundVolume(Number(event.target.value))}
                    className="w-full"
                  />
                  {selectedSound?.preview_url && (
                    <audio
                      ref={soundPreviewRef}
                      src={selectedSound.preview_url}
                      loop
                    />
                  )}
                </div>
              )}

              {activeTool === 'genre' && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-300">Pick one genre (required)</div>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => setSelectedGenre(genre)}
                        className={`px-3 py-1.5 rounded-full text-xs border ${
                          selectedGenre === genre
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-transparent'
                            : 'bg-white/10 border-white/20'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTool === 'cover' && selectedMedia?.kind === 'video' && (
                <div className="space-y-2 text-xs">
                  <div>Select video cover frame</div>
                  <input
                    type="range"
                    min={trimStartSec}
                    max={Math.max(trimEndSec, trimStartSec + 0.1)}
                    step={0.1}
                    value={coverTimeSec}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setCoverTimeSec(next);
                      if (editorVideoRef.current) editorVideoRef.current.currentTime = next;
                    }}
                    className="w-full"
                  />
                  <div className="text-[11px] text-gray-400">Cover at {coverTimeSec.toFixed(1)}s</div>
                </div>
              )}

              {activeTool === 'trim' && selectedMedia?.kind !== 'video' && (
                <div className="text-xs text-gray-400">Trim is available for video posts.</div>
              )}

              {activeTool === 'cover' && selectedMedia?.kind !== 'video' && (
                <div className="text-xs text-gray-400">Cover frame is available for video posts.</div>
              )}
            </div>
          </div>
        )}

        {showSounds && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-end justify-center">
            <div className="w-full max-w-[430px] h-[70%] bg-[#121212] border-t border-white/10 rounded-t-2xl p-4 overflow-y-auto">
              <div className="text-center font-semibold mb-3">Add Sound</div>

              <input
                value={soundSearch}
                onChange={(event) => setSoundSearch(event.target.value)}
                placeholder="Search tracks"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm mb-3"
              />

              {visibleSounds.map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => {
                    setSelectedSound(sound);
                    setTrackName(sound.track_name || '');
                    setArtistName(sound.artist_name || '');
                    setShowSounds(false);
                  }}
                  className="w-full py-3 border-b border-white/10 text-left flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                    {sound.thumbnail_url ? (
                      <img src={sound.thumbnail_url} className="h-full w-full object-cover" alt={sound.track_name} />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-xs">
                        SND
                      </div>
                    )}
                  </div>
                  <div className="truncate">
                    <div className="font-medium truncate">{sound.track_name}</div>
                    <div className="text-xs text-gray-400 truncate">{sound.artist_name}</div>
                  </div>
                </button>
              ))}

              <button
                onClick={() => setShowSounds(false)}
                className="mt-4 w-full py-2 rounded-xl bg-white/10 border border-white/20"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute left-4 right-4 bottom-5 z-50 rounded-xl bg-red-500/10 border border-red-500/35 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {posting && (
          <div className="absolute inset-0 bg-black/85 z-50 flex flex-col items-center justify-center gap-4">
            {!success ? (
              <>
                <div className="text-sm text-white/85">Uploading...</div>
                <div className="w-2/3 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-xs text-white/70">{progress}%</div>
              </>
            ) : (
              <div className="text-lg font-semibold animate-pulse">Posted</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
