'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, uploadPostMedia, processMedia } from '@/lib/supabase';
import { startCreateUpload } from '@/lib/createUploadQueue';

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

const isLikelyMobileBrowser = () => {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent || '';
  const matchesMobileAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent);
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const minScreenSide = Math.min(window.screen.width, window.screen.height, window.innerWidth, window.innerHeight);
  const mobileSizedViewport = minScreenSide <= 1024;

  return matchesMobileAgent || (hasTouch && mobileSizedViewport);
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
  const [isMobileCapture, setIsMobileCapture] = useState(false);
  const [isLandscapeViewport, setIsLandscapeViewport] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<FacingMode>('environment');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 1 });
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [lastGalleryThumbnail, setLastGalleryThumbnail] = useState<string | null>(null);

  const [recording, setRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [clipSegments, setClipSegments] = useState<number[]>([]);
  const [totalRecordedMs, setTotalRecordedMs] = useState(0);
  const [liveClipMs, setLiveClipMs] = useState(0);

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

  const showPortraitGuard = view === 'camera' && isMobileCapture && isLandscapeViewport;

  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const editorVideoRef = useRef<HTMLVideoElement | null>(null);
  const hiddenFrameVideoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const soundPreviewRef = useRef<HTMLAudioElement | null>(null);

  const cameraStreamRef = useRef<MediaStream | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const holdTimeoutRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const activeClipStartRef = useRef<number | null>(null);

  const progressRafRef = useRef<number | null>(null);
  const previewRenderRafRef = useRef<number | null>(null);
  const selectedMediaUrlRef = useRef<string | null>(null);
  const galleryUrlsRef = useRef<string[]>([]);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const microphoneAllowedRef = useRef(false);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);

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

  const cameraUiLayout = useMemo(() => {
    const vh = viewportHeight;
    const compactViewport = vh > 0 && vh < 740;
    const tallViewport = vh >= 920;

    return {
      topControlsPaddingTop: `calc(env(safe-area-inset-top) + ${compactViewport ? '0.5rem' : tallViewport ? '0.9rem' : '0.7rem'})`,
      progressTop: `calc(env(safe-area-inset-top) + ${compactViewport ? '3.8rem' : tallViewport ? '4.5rem' : '4.2rem'})`,
      helperTextBottom: `calc(env(safe-area-inset-bottom) + ${compactViewport ? '6.1rem' : tallViewport ? '7.4rem' : '6.8rem'})`,
      micStatusBottom: `calc(env(safe-area-inset-bottom) + ${compactViewport ? '8.1rem' : tallViewport ? '9.3rem' : '8.7rem'})`,
      controlsBottom: `calc(env(safe-area-inset-bottom) + ${compactViewport ? '0.55rem' : '0.9rem'})`,
      mobileBadgeTop: `calc(env(safe-area-inset-top) + ${compactViewport ? '5.2rem' : '5.8rem'})`,
    };
  }, [viewportHeight]);

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

  const stopPreviewRenderLoop = () => {
    if (previewRenderRafRef.current) {
      cancelAnimationFrame(previewRenderRafRef.current);
      previewRenderRafRef.current = null;
    }
  };

  const stopRecordingStream = () => {
    if (!recordingStreamRef.current) return;
    if (recordingStreamRef.current !== cameraStreamRef.current) {
      recordingStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    recordingStreamRef.current = null;
  };

  const stopCameraStream = () => {
    setCameraReady(false);
    stopPreviewRenderLoop();
    stopRecordingStream();
    if (!cameraStreamRef.current) return;
    cameraStreamRef.current.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
  };

  const lockPortraitOrientation = async () => {
    if (!isMobileCapture) return;

    const orientation = (screen as Screen & {
      orientation?: { lock?: (value: string) => Promise<void> };
    }).orientation;

    if (!orientation?.lock) return;
    await orientation.lock('portrait').catch(() => undefined);
  };

  const renderVideoFrameToCanvas = () => {
    const video = cameraVideoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return false;

    const targetWidth = isMobileCapture ? 720 : video.videoWidth;
    const targetHeight = isMobileCapture ? 1280 : video.videoHeight;
    if (canvas.width !== targetWidth) canvas.width = targetWidth;
    if (canvas.height !== targetHeight) canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const sourceAspect = video.videoWidth / video.videoHeight;
    const targetAspect = targetWidth / targetHeight;

    let sx = 0;
    let sy = 0;
    let sw = video.videoWidth;
    let sh = video.videoHeight;

    if (sourceAspect > targetAspect) {
      sw = video.videoHeight * targetAspect;
      sx = (video.videoWidth - sw) / 2;
    } else if (sourceAspect < targetAspect) {
      sh = video.videoWidth / targetAspect;
      sy = (video.videoHeight - sh) / 2;
    }

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
    return true;
  };

  const startPreviewRenderLoop = () => {
    stopPreviewRenderLoop();
    if (!isMobileCapture) return;

    const render = () => {
      renderVideoFrameToCanvas();
      previewRenderRafRef.current = requestAnimationFrame(render);
    };

    previewRenderRafRef.current = requestAnimationFrame(render);
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
      setLiveClipMs(liveSegmentMs);
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

  const applyZoomLevel = async (nextZoom: number) => {
    const track = cameraStreamRef.current?.getVideoTracks()?.[0];
    if (!track) return;

    const safeZoom = Math.max(zoomRange.min, Math.min(zoomRange.max, nextZoom));
    const capabilities = typeof track.getCapabilities === 'function' ? (track.getCapabilities() as MediaTrackCapabilities & { zoom?: { min?: number; max?: number } | number }) : null;

    try {
      if (capabilities && 'zoom' in capabilities) {
        await track.applyConstraints({ advanced: [{ zoom: safeZoom } as unknown as MediaTrackConstraintSet] });
      }
      setZoomLevel(safeZoom);
    } catch {
      setZoomLevel(safeZoom);
    }
  };

  const configureVideoTrack = async (stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    const capabilities = typeof track.getCapabilities === 'function'
      ? (track.getCapabilities() as MediaTrackCapabilities & {
          zoom?: { min?: number; max?: number } | number;
          focusMode?: string[];
          exposureCompensation?: { min?: number; max?: number } | number;
          exposureMode?: string[];
          whiteBalanceMode?: string[];
        })
      : null;

    const nextMinZoom = capabilities && 'zoom' in capabilities && typeof capabilities.zoom === 'object'
      ? capabilities.zoom?.min || 1
      : 1;
    const nextMaxZoom = capabilities && 'zoom' in capabilities && typeof capabilities.zoom === 'object'
      ? capabilities.zoom?.max || 1
      : 1;

    setZoomRange({ min: nextMinZoom, max: nextMaxZoom });
    setZoomLevel(nextMinZoom);

    const advancedConstraints: MediaTrackConstraintSet[] = [];

    if (capabilities?.focusMode?.includes('continuous')) {
      advancedConstraints.push({ focusMode: 'continuous' as unknown as ConstrainDOMString } as unknown as MediaTrackConstraintSet);
    }

    if (capabilities?.exposureMode?.includes('continuous')) {
      advancedConstraints.push({ exposureMode: 'continuous' as unknown as ConstrainDOMString } as unknown as MediaTrackConstraintSet);
    }

    if (capabilities?.whiteBalanceMode?.includes('continuous')) {
      advancedConstraints.push({ whiteBalanceMode: 'continuous' as unknown as ConstrainDOMString } as unknown as MediaTrackConstraintSet);
    }

    if (
      capabilities &&
      'exposureCompensation' in capabilities &&
      typeof capabilities.exposureCompensation === 'object'
    ) {
      const exposureMin = capabilities.exposureCompensation?.min ?? 0;
      const exposureMax = capabilities.exposureCompensation?.max ?? 0;
      advancedConstraints.push({
        exposureCompensation: (exposureMin + exposureMax) / 2,
      } as MediaTrackConstraintSet);
    }

    if (nextMaxZoom > nextMinZoom) {
      advancedConstraints.push({ zoom: nextMinZoom } as MediaTrackConstraintSet);
    }

    if (advancedConstraints.length > 0) {
      await track.applyConstraints({ advanced: advancedConstraints }).catch(() => undefined);
    }
  };

  const attachStreamToPreview = async (stream: MediaStream) => {
    const video = cameraVideoRef.current;
    if (!video) return;

    video.srcObject = stream;

    // Wait for metadata before attempting playback so videoWidth/videoHeight are available.
    await new Promise<void>((resolve) => {
      if (video.readyState >= 1) {
        resolve();
        return;
      }

      const onLoaded = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        resolve();
      };

      video.addEventListener('loadedmetadata', onLoaded, { once: true });
      window.setTimeout(() => {
        video.removeEventListener('loadedmetadata', onLoaded);
        resolve();
      }, 1200);
    });

    await video.play().catch(() => undefined);

    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setCameraReady(true);
      if (isMobileCapture) {
        startPreviewRenderLoop();
      }
    }
  };

  const startCameraStream = async (facing: FacingMode, withAudio: boolean) => {
    setCameraReady(false);

    const audioConstraints = withAudio
      ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        }
      : false;

    const getVideoConstraints = (mode: FacingMode) =>
      isMobileCapture
        ? {
            facingMode: { ideal: mode },
            width: { ideal: 1080 },
            height: { ideal: 1920 },
            aspectRatio: { ideal: 9 / 16 },
            resizeMode: 'crop-and-scale' as ConstrainDOMString,
            frameRate: { ideal: 30, max: 30 },
          }
        : {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 30 },
          };

    let stream: MediaStream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(facing),
        audio: audioConstraints,
      });
    } catch {
      const fallbackFacing: FacingMode = facing === 'user' ? 'environment' : 'user';
      stream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(fallbackFacing),
        audio: audioConstraints,
      });
      setCameraFacing(fallbackFacing);
    }

    stopCameraStream();
    cameraStreamRef.current = stream;
    await configureVideoTrack(stream).catch(() => undefined);
    await attachStreamToPreview(stream);
  };

  const initializePermissions = async () => {
    if (isPowr || showPortraitGuard) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraDenied(true);
      setMicDenied(true);
      setRequestingPermissions(false);
      return;
    }

    setRequestingPermissions(true);
    await lockPortraitOrientation();

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
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
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

  const handlePreviewTap = async (event: React.PointerEvent<HTMLDivElement>) => {
    if (view !== 'camera' || cameraDenied || requestingPermissions) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setFocusPoint({ x, y });

    window.setTimeout(() => {
      setFocusPoint(null);
    }, 900);

    const track = cameraStreamRef.current?.getVideoTracks()?.[0];
    const capabilities = track && typeof track.getCapabilities === 'function'
      ? (track.getCapabilities() as MediaTrackCapabilities & { focusMode?: string[] })
      : null;

    if (track && capabilities?.focusMode?.includes('single-shot')) {
      await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' as unknown as ConstrainDOMString } as unknown as MediaTrackConstraintSet] }).catch(() => undefined);
    }
  };

  const handlePreviewTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2 || zoomRange.max <= zoomRange.min) return;

    const [first, second] = Array.from(event.touches);
    const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);

    if (!pinchRef.current) {
      pinchRef.current = { distance, zoom: zoomLevel };
      return;
    }

    const scale = distance / pinchRef.current.distance;
    const nextZoom = pinchRef.current.zoom * scale;
    void applyZoomLevel(nextZoom);
  };

  const handlePreviewTouchEnd = () => {
    pinchRef.current = null;
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
    setIsMobileCapture(isLikelyMobileBrowser());
  }, []);

  useEffect(() => {
    const updateViewportOrientation = () => {
      const landscape = window.matchMedia('(orientation: landscape)').matches;
      setIsLandscapeViewport(landscape);
      setViewportHeight(Math.round(window.visualViewport?.height || window.innerHeight));
    };

    updateViewportOrientation();
    window.addEventListener('resize', updateViewportOrientation);
    window.addEventListener('orientationchange', updateViewportOrientation);
    window.visualViewport?.addEventListener('resize', updateViewportOrientation);

    return () => {
      window.removeEventListener('resize', updateViewportOrientation);
      window.removeEventListener('orientationchange', updateViewportOrientation);
      window.visualViewport?.removeEventListener('resize', updateViewportOrientation);
    };
  }, []);

  useEffect(() => {
    const shouldLockScroll = view === 'camera';
    if (!shouldLockScroll) return;

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [view]);

  // Attach the captured stream to the preview element once it mounts.
  useEffect(() => {
    if (requestingPermissions || view !== 'camera') return;
    const stream = cameraStreamRef.current;
    const video = cameraVideoRef.current;
    if (!video || !stream) return;

    if (video.srcObject !== stream) {
      void attachStreamToPreview(stream);
      return;
    }

    if (cameraReady && isMobileCapture) {
      startPreviewRenderLoop();
    }
  }, [cameraReady, isMobileCapture, requestingPermissions, view]);

  useEffect(() => {
    void initializePermissions();

    return () => {
      stopProgressLoop();
      stopPreviewRenderLoop();
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
  }, [isLandscapeViewport, isMobileCapture]);

  useEffect(() => {
    if (view === 'camera') {
      if (showPortraitGuard) {
        stopPreviewRenderLoop();
        stopCameraStream();
        return;
      }

      if (!cameraStreamRef.current && !requestingPermissions && !cameraDenied && !isPowr && !showPortraitGuard) {
        void initializePermissions();
      }
      return;
    }

    stopPreviewRenderLoop();
    stopCameraStream();
  }, [cameraDenied, isPowr, requestingPermissions, showPortraitGuard, view]);

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
    stopRecordingStream();
    recorderChunksRef.current = [];
    activeClipStartRef.current = null;
    setClipSegments([]);
    setTotalRecordedMs(0);
    setRecording(false);
    setRecordingProgress(0);
  };

  const buildRecordingStream = () => {
    if (!cameraStreamRef.current) return null;
    if (!isMobileCapture) return cameraStreamRef.current;

    const canvas = captureCanvasRef.current;
    if (!canvas || typeof canvas.captureStream !== 'function') {
      return cameraStreamRef.current;
    }

    renderVideoFrameToCanvas();
    const canvasStream = canvas.captureStream(30);
    const audioTracks = cameraStreamRef.current.getAudioTracks();
    return new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
  };

  const beginRecordingIfNeeded = async () => {
    const nextStream = buildRecordingStream();
    if (!nextStream) return false;
    if (typeof MediaRecorder === 'undefined') {
      setError('Media recording is not available on this device.');
      return false;
    }

    if (!mediaRecorderRef.current) {
      recordingStreamRef.current = nextStream;
      const mimeType = getPreferredRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(nextStream, {
            mimeType,
            videoBitsPerSecond: isMobileCapture ? 2_500_000 : 4_000_000,
            audioBitsPerSecond: 128_000,
          })
        : new MediaRecorder(nextStream, {
            videoBitsPerSecond: isMobileCapture ? 2_500_000 : 4_000_000,
            audioBitsPerSecond: 128_000,
          });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recorderChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        setRecording(false);
        activeClipStartRef.current = null;
        stopProgressLoop();
        stopRecordingStream();

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

  const startClipRecording = async () => {
    if (cameraDenied || requestingPermissions || isPowr) return;
    if (!(await beginRecordingIfNeeded())) return;

    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    clearError();
    await lockPortraitOrientation();

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
    setLiveClipMs(0);
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

    if (!cameraReady || !video.videoWidth || !video.videoHeight) {
      setError('Camera is still loading. Try again.');
      return;
    }

    const canvas = isMobileCapture
      ? captureCanvasRef.current || document.createElement('canvas')
      : document.createElement('canvas');

    if (isMobileCapture) {
      if (!renderVideoFrameToCanvas()) {
        setError('Camera is still loading. Try again.');
        return;
      }
    } else {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const canvasContext = canvas.getContext('2d');
      if (!canvasContext) {
        setError('Unable to capture photo right now.');
        return;
      }
      canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setError('Unable to capture photo right now.');
      return;
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.95);
    });

    if (!blob) {
      setError('Photo capture failed. Please try again.');
      return;
    }

    if (navigator.vibrate) navigator.vibrate(6);
    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setSelectedFromFile(file);
  };

  const onCapturePointerDown = () => {
    if (cameraDenied || requestingPermissions || isPowr) return;

    holdTimeoutRef.current = window.setTimeout(() => {
      void startClipRecording();
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
    setView('gallery');
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
    setLastGalleryThumbnail(nextItems[0]?.url || null);
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

      let preparedMediaFile: File | null = null;
      let preparedCoverFile: File | null = null;

      if (selectedMedia) {
        setProgress(22);

        const fileForUpload = await buildTrimmedVideo(selectedMedia.file);
        const finalFile = await processMedia(fileForUpload, {
          mobileVideo: isMobileCapture,
          onProgress: (next, message) => {
            setProgress(Math.max(22, Math.min(58, Math.round(22 + next * 0.36))));
            if (message) setError(null);
          },
        });
        preparedMediaFile = finalFile;

        if (selectedMedia.kind === 'video') {
          const coverFile = await extractCoverFrame(fileForUpload, coverTimeSec || trimStartSec || 0);
          if (coverFile) {
            preparedCoverFile = await processMedia(coverFile);
          }
        }
      }
      setProgress(64);

      const hashtags = parseHashtags(caption);
      const mentions = parseMentions(caption);

      startCreateUpload(async ({ setProgress: setBackgroundProgress, retry }) => {
        let mediaUrl: string | null = null;
        let thumbnailUrl: string | null = null;

        if (preparedMediaFile) {
          setBackgroundProgress(20, 'Uploading media...');
          mediaUrl = await retry('Media upload', () => uploadPostMedia(preparedMediaFile as File, user.id));
        }

        if (preparedCoverFile) {
          setBackgroundProgress(44, 'Uploading cover frame...');
          thumbnailUrl = await retry('Cover upload', () => uploadPostMedia(preparedCoverFile as File, user.id));
        }

        let soundId: string | null = null;

        if (selectedSound || trackName) {
          setBackgroundProgress(62, 'Syncing sound...');
          const requestedTrack = selectedSound?.track_name || trackName;
          const requestedArtist = selectedSound?.artist_name || artistName;

          const existing = await retry('Sound lookup', async () => {
            const { data, error } = await supabase
              .from('sounds')
              .select('*')
              .eq('track_name', requestedTrack)
              .eq('artist_name', requestedArtist)
              .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
          });

          if (existing) {
            soundId = existing.id;
            await retry('Sound update', async () => {
              const { error } = await supabase
                .from('sounds')
                .update({ usage_count: (existing.usage_count || 0) + 1 })
                .eq('id', existing.id);

              if (error) throw error;
            });
          } else {
            const createdSound = await retry('Sound create', async () => {
              const { data, error } = await supabase
                .from('sounds')
                .insert({
                  track_name: requestedTrack,
                  artist_name: requestedArtist,
                  usage_count: 1,
                  thumbnail_url: selectedSound?.thumbnail_url || null,
                })
                .select()
                .single();

              if (error) throw error;
              return data;
            });

            soundId = createdSound?.id || null;
          }
        }

        setBackgroundProgress(82, 'Publishing post...');

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

        await retry('Post publish', () => insertPostWithFallback(payload));
        localStorage.removeItem('optimistic_post');
      });

      setProgress(100);
      setSuccess(true);
      resetVideoSession();

      window.setTimeout(() => {
        router.push('/now');
      }, 240);
    } catch (postError: any) {
      setError(postError?.message || 'Unable to publish post right now.');
      setPosting(false);
    }
  };

  const cameraUnavailable = cameraDenied || isPowr;

  return (
    <div
      className="fixed inset-0 z-40 w-screen h-screen bg-black overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ overscrollBehavior: 'none' }}
    >
      <div className="absolute inset-0 w-full h-[100dvh] relative bg-black text-white overflow-hidden">
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={onGalleryInputChange}
        />

        <video ref={hiddenFrameVideoRef} className="hidden" playsInline />
        <canvas ref={captureCanvasRef} className="hidden" />

        {view === 'camera' && (
          <>
            <div
              className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 pb-3"
              style={{ paddingTop: cameraUiLayout.topControlsPaddingTop }}
            >
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

            {!showPortraitGuard && !cameraUnavailable && !requestingPermissions && (
              <>
                <div
                  className="absolute inset-0"
                  onPointerDown={handlePreviewTap}
                  onTouchMove={handlePreviewTouchMove}
                  onTouchEnd={handlePreviewTouchEnd}
                >
                  <video
                    ref={cameraVideoRef}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-150"
                    autoPlay
                    playsInline
                    muted
                    style={{ transform: zoomRange.max <= zoomRange.min ? `scale(${zoomLevel})` : 'scale(1)' }}
                  />

                  {focusPoint && (
                    <div
                      className="absolute w-16 h-16 rounded-full border border-white/80 shadow-[0_0_30px_rgba(255,255,255,0.2)] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ left: `${focusPoint.x}%`, top: `${focusPoint.y}%` }}
                    />
                  )}
                </div>

                <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/70" />

                {!cameraReady && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 backdrop-blur-[2px]">
                    <div className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-center text-sm text-white/90">
                      Finalizing camera preview...
                    </div>
                  </div>
                )}

                <div
                  className="absolute left-4 right-4 z-30"
                  style={{ top: cameraUiLayout.progressTop }}
                >
                  <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100"
                      style={{ width: `${Math.min(((totalRecordedMs + liveClipMs) / RECORDING_MAX_MS) * 100, 100)}%` }}
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

                <div
                  className="absolute left-0 right-0 z-30 text-center text-xs text-white/80"
                  style={{ bottom: cameraUiLayout.helperTextBottom }}
                >
                  {isMobileCapture
                    ? 'Tap photo. Hold to record vertical clips. Swipe up for gallery.'
                    : 'Tap photo. Hold to record clips. Swipe up for gallery.'}
                </div>

                {isMobileCapture && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 z-30 rounded-full bg-black/55 border border-white/15 px-3 py-1 text-[11px] text-white/85"
                    style={{ top: cameraUiLayout.mobileBadgeTop }}
                  >
                    Mobile 9:16 capture active
                  </div>
                )}

                {micDenied && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 z-30 rounded-full bg-black/55 border border-white/15 px-3 py-1 text-[11px] text-white/85"
                    style={{ bottom: cameraUiLayout.micStatusBottom }}
                  >
                    Microphone denied. Video records without audio.
                  </div>
                )}

                <div
                  className="absolute left-0 right-0 z-30 h-24"
                  style={{ bottom: cameraUiLayout.controlsBottom }}
                >
                  <button
                    type="button"
                    onClick={openGallery}
                    className="absolute left-6 bottom-4 w-14 h-14 rounded-[18px] overflow-hidden border border-white/20 bg-white/10 shadow-lg"
                  >
                    {lastGalleryThumbnail ? (
                      <img src={lastGalleryThumbnail} alt="Recent gallery item" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-[10px] uppercase tracking-wide">
                        Open
                      </div>
                    )}
                  </button>

                  <div className={`absolute left-1/2 -translate-x-1/2 bottom-1 relative h-24 w-24 ${recording ? 'drop-shadow-[0_0_16px_rgba(236,72,153,0.65)]' : ''}`}>
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
                      disabled={!cameraReady}
                      className={`absolute inset-[12px] rounded-full border border-white/30 transition-all touch-none ${
                        recording
                          ? 'bg-gradient-to-br from-fuchsia-500 to-purple-500 scale-[0.93]'
                          : cameraReady
                            ? 'bg-white'
                            : 'bg-white/65'
                      }`}
                    />
                  </div>

                  {clipSegments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        void finalizeRecordedVideo();
                      }}
                      className="absolute right-6 bottom-4 px-4 py-3 rounded-full bg-white/15 border border-white/20 text-xs"
                    >
                      Next
                    </button>
                  )}
                </div>
              </>
            )}

            {showPortraitGuard && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center bg-black/90 z-40">
                <div className="w-20 h-20 rounded-full bg-white/10 border border-white/15 mb-5" />
                <h2 className="text-xl font-semibold mb-2">Rotate to portrait</h2>
                <p className="text-sm text-gray-400 max-w-[320px]">
                  The camera is optimized for vertical capture. Rotate your device to continue.
                </p>
              </div>
            )}

            {(cameraUnavailable || requestingPermissions) && !showPortraitGuard && (
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <div className="w-20 h-20 rounded-full bg-white/10 border border-white/15 mb-5" />
                <h2 className="text-xl font-semibold mb-2">
                  {requestingPermissions ? 'Preparing camera...' : 'Camera unavailable'}
                </h2>
                <p className="text-sm text-gray-400 max-w-[320px] mb-6">
                  {requestingPermissions
                    ? isMobileCapture
                      ? 'Requesting vertical mobile camera and clean microphone input.'
                      : 'Requesting camera first, then microphone to keep capture native.'
                    : 'Camera permission was denied or the device camera is unavailable. Use gallery to keep creating.'}
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
