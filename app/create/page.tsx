'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, DragEvent, useRef } from 'react';
import { supabase, uploadPostMedia, processMedia } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const type = searchParams.get('type'); // ✅ FIXED

  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; duration?: number; count?: number } | null>(null);

  const [trackSearch, setTrackSearch] = useState('');
  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);

  const [trackName, setTrackName] = useState('');
  const [artistName, setArtistName] = useState('');

  const [sounds, setSounds] = useState<any[]>([]);
  const [showSounds, setShowSounds] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSounds = async () => {
      const { data } = await supabase
        .from('sounds')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(20);

      setSounds(data || []);
    };

    fetchSounds();
  }, []);

  useEffect(() => {
    return () => {
      previews.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [previews]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const loadVideoDuration = (fileUrl: string) =>
    new Promise<number>((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = fileUrl;
      video.onloadedmetadata = () => {
        resolve(video.duration);
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => resolve(0);
    });

  const clearSelectedMedia = () => {
    setFiles([]);
    setFileInfo(null);
    setFileError(null);
    setPreviews((prev) => {
      prev.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      return [];
    });
  };

  const setFilesWithPreview = async (incoming: File[]) => {
    if (!incoming.length) return;

    if (mediaType === 'video') {
      const first = incoming[0];
      if (!first.type.startsWith('video/')) {
        setFileError('Please select a video file.');
        return;
      }

      const url = URL.createObjectURL(first);
      const duration = await loadVideoDuration(url);

      setFileError(null);
      setFiles([first]);
      setPreviews((prev) => {
        prev.forEach((item) => {
          if (item.startsWith('blob:')) URL.revokeObjectURL(item);
        });
        return [url];
      });
      setFileInfo({
        name: first.name,
        size: first.size,
        duration: duration || undefined,
      });

      return;
    }

    const onlyImages = incoming.filter((file) => file.type.startsWith('image/'));
    if (onlyImages.length !== incoming.length) {
      setFileError('Please select image files only for carousel posts.');
      return;
    }

    if (onlyImages.length > 10) {
      setFileError('You can upload up to 10 images per post.');
      return;
    }

    const nextPreviews = onlyImages.map((file) => URL.createObjectURL(file));
    const totalSize = onlyImages.reduce((sum, item) => sum + item.size, 0);

    setFileError(null);
    setFiles(onlyImages);
    setPreviews((prev) => {
      prev.forEach((item) => {
        if (item.startsWith('blob:')) URL.revokeObjectURL(item);
      });
      return nextPreviews;
    });
    setFileInfo({
      name: onlyImages[0].name,
      size: totalSize,
      count: onlyImages.length,
    });
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    const dropped = Array.from(event.dataTransfer.files || []);
    if (!dropped.length) return;

    if (dropped[0].type.startsWith('image/')) setMediaType('image');
    if (dropped[0].type.startsWith('video/')) setMediaType('video');

    await setFilesWithPreview(dropped);
  };

  const handlePost = async () => {
    if (posting) return;
    if (!content && files.length === 0) return;

    setPosting(true); // ✅ FIX (was missing)

    // 🔥 OPTIMISTIC POST
    const tempPost = {
      id: `temp-${Date.now()}`,
      content,
      media_url: previews[0] || null,
      media_urls: previews.length > 1 ? previews : null,
      user_id: 'temp-user',
      created_at: new Date().toISOString(),
      track_name: trackName,
      artist_name: artistName,
      is_temp: true,
    };

    localStorage.setItem('optimistic_post', JSON.stringify(tempPost));

    setProgress(10);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    let mediaUrl: string | null = null;
    const mediaUrls: string[] = [];

    if (files.length > 0 && type !== 'powr') {
      setProgress(20);

      if (mediaType === 'image' && files.length > 1) {
        for (let i = 0; i < files.length; i += 1) {
          const finalFile = await processMedia(files[i]);
          const uploadedUrl = await uploadPostMedia(finalFile, user.id);
          mediaUrls.push(uploadedUrl);
          const progressSlice = Math.round(((i + 1) / files.length) * 50);
          setProgress(20 + progressSlice);
        }
        mediaUrl = mediaUrls[0] || null;
      } else {
        const finalFile = await processMedia(files[0]);
        setProgress(40);
        mediaUrl = await uploadPostMedia(finalFile, user.id);
        setProgress(70);
      }
    }

    let soundId = null;

    if (trackName) {
      const { data: existing } = await supabase
        .from('sounds')
        .select('*')
        .eq('track_name', trackName)
        .eq('artist_name', artistName)
        .single();

      if (existing) {
        soundId = existing.id;

        await supabase
          .from('sounds')
          .update({
            usage_count: (existing.usage_count || 0) + 1,
          })
          .eq('id', existing.id);
      } else {
        const { data: newSound } = await supabase
          .from('sounds')
          .insert({
            track_name: trackName,
            artist_name: artistName,
            usage_count: 1,
          })
          .select()
          .single();

        soundId = newSound.id;
      }
    }

    setProgress(85);

    const postPayload: Record<string, any> = {
      content,
      user_id: user.id,
      media_url: type === 'powr' ? null : mediaUrl, // ✅ CORE FIX
      track_name: trackName,
      artist_name: artistName,
      sound_id: soundId,
    };

    if (mediaUrls.length > 1) {
      postPayload.media_urls = mediaUrls;
    }

    let { error: insertError } = await supabase.from('posts').insert(postPayload);

    if (insertError && postPayload.media_urls) {
      delete postPayload.media_urls;
      const fallbackInsert = await supabase.from('posts').insert(postPayload);
      insertError = fallbackInsert.error;
    }

    if (insertError) {
      throw insertError;
    }

    setProgress(100);
    setSuccess(true);

    // remove optimistic after success
    setTimeout(() => {
      localStorage.removeItem('optimistic_post');
    }, 1000);

    setTimeout(() => {
      router.push('/now');
    }, 800);
  };

  const filteredSounds = trackSearch
    ? sounds.filter((sound) =>
        sound.track_name?.toLowerCase().includes(trackSearch.toLowerCase()) ||
        sound.artist_name?.toLowerCase().includes(trackSearch.toLowerCase())
      )
    : sounds.slice(0, 6);

  return (
    <div className="w-full min-h-screen bg-black flex justify-center">

      <div className="w-full max-w-[420px] h-[100dvh] relative bg-black text-white">

        {/* TOP BAR */}
        <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center px-4 py-4 text-sm">
          <button onClick={() => router.back()}>Cancel</button>
          <button
            onClick={() => {
              if (files.length === 0 && type !== 'powr') {
                fileInputRef.current?.click();
              } else {
                handlePost();
              }
            }}
            disabled={posting}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-green-400 to-purple-500 text-black font-bold text-xl flex items-center justify-center hover:shadow-lg transition-shadow disabled:opacity-50"
          >
            {files.length === 0 && type !== 'powr' ? '📁' : '+'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={mediaType === 'image' ? 'image/*' : 'video/*'}
            multiple={mediaType === 'image'}
            hidden
            onChange={async (e) => {
              const selected = Array.from(e.target.files || []);
              if (!selected.length) return;
              await setFilesWithPreview(selected);
            }}
          />
        </div>

        {/* MEDIA */}
        {type !== 'powr' && (
          <div className="space-y-3 px-4 pt-20">
            <div className="grid grid-cols-2 gap-2 mb-2">
              {(['image', 'video'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setMediaType(option);
                    clearSelectedMedia();
                  }}
                  className={`rounded-xl px-3 py-2 font-semibold text-sm transition-all ${
                    mediaType === option
                      ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-lg'
                      : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                  }`}
                >
                  {option === 'image' ? 'Image' : 'Video'}
                </button>
              ))}
            </div>

            <div
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center text-sm h-[300px] flex items-center justify-center ${
                dragActive ? 'border-cyan-300 bg-cyan-500/20' : 'border-white/30 bg-white/5'
              }`}
            >
              {previews.length === 0 ? (
                <>
                  <input
                    type="file"
                    accept={mediaType === 'image' ? 'image/*' : 'video/*'}
                    multiple={mediaType === 'image'}
                    hidden
                    onChange={async (e) => {
                      const selected = Array.from(e.target.files || []);
                      if (!selected.length) return;
                      await setFilesWithPreview(selected);
                    }}
                  />
                  {fileError && <p className="mt-2 text-xs text-red-300">{fileError}</p>}
                </>
              ) : (
                <div className="relative w-full h-[220px] overflow-hidden rounded-xl bg-black">
                  {mediaType === 'image' ? (
                    previews.length > 1 ? (
                      <div className="h-full w-full overflow-x-auto snap-x snap-mandatory flex">
                        {previews.map((src, index) => (
                          <div key={`${src}-${index}`} className="h-full w-full shrink-0 snap-center relative">
                            <img
                              src={src}
                              className="h-full w-full object-cover"
                              alt={`Preview ${index + 1}`}
                            />
                            <div className="absolute top-2 right-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] text-white font-semibold">
                              {index + 1}/{previews.length}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <img
                        src={previews[0]}
                        className="h-full w-full object-cover"
                        alt="Preview"
                      />
                    )
                  ) : (
                    <video
                      src={previews[0]}
                      className="h-full w-full object-cover"
                      autoPlay
                      loop
                      muted
                      controls
                    />
                  )}

                  <button
                    onClick={() => {
                      clearSelectedMedia();
                    }}
                    className="absolute top-2 right-2 rounded-full bg-black/60 px-3 py-1 text-xs"
                  >
                    Remove
                  </button>

                  {fileInfo && (
                    <div className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-2 py-1 text-xs text-white">
                      <div>
                        {fileInfo.count && fileInfo.count > 1 ? `${fileInfo.count} images` : fileInfo.name}
                      </div>
                      <div>{formatBytes(fileInfo.size)}{fileInfo.duration ? ` • ${fileInfo.duration.toFixed(1)}s` : ''}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {mediaType === 'image' && (
              <div className="text-[11px] text-gray-400 px-1">
                Carousel posts support up to 10 images.
              </div>
            )}
          </div>
        )}

        {/* UPLOAD OVERLAY */}
        {posting && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-50">

            {!success ? (
              <>
                <div className="text-sm opacity-80">
                  Uploading...
                </div>

                <div className="w-2/3 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-purple-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="text-xs opacity-60">
                  {progress}%
                </div>
              </>
            ) : (
              <div className="text-lg font-semibold animate-pulse">
                Posted ✓
              </div>
            )}

          </div>
        )}

        {/* BOTTOM */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3 bg-gradient-to-t from-black/80 to-transparent">

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              value={trackSearch}
              onChange={(e) => setTrackSearch(e.target.value)}
              placeholder="Search track to auto-suggest"
              className="w-full bg-white/12 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-300"
            />
            <button
              onClick={() => setShowSounds(true)}
              className="text-xs bg-white/10 px-3 py-2 rounded-full"
            >
              Browse
            </button>
          </div>

          {trackSearch && filteredSounds.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-xl bg-white/10 p-2 border border-white/20">
              {filteredSounds.slice(0, 5).map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => {
                    setTrackName(sound.track_name);
                    setArtistName(sound.artist_name);
                    setShowSounds(false);
                    setTrackSearch('');
                  }}
                  className="flex items-center gap-2 w-full py-1.5 px-2 rounded-md text-left text-xs text-white hover:bg-white/20"
                >
                  <span className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-pink-500 text-center leading-8 text-white text-[10px]">♫</span>
                  <div className="truncate">
                    <div className="font-semibold">{sound.track_name}</div>
                    <div className="text-[10px] text-gray-200">{sound.artist_name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowSounds(true)}
            className="text-xs bg-white/10 px-3 py-2 rounded-full"
          >
            🎵 {trackName ? `${trackName} — ${artistName}` : 'Add Sound'}
          </button>

          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={
              type === 'powr'
                ? 'Share your thoughts...'
                : 'Write a caption...'
            }
            className="w-full bg-transparent border border-white/20 rounded-xl p-3 text-sm"
          />

          <button
            onClick={handlePost}
            disabled={posting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-green-400 to-purple-500 text-black font-semibold"
          >
            {posting ? 'Posting...' : 'Share'}
          </button>
        </div>

        {/* SOUND MODAL */}
        {showSounds && (
          <div className="fixed inset-0 bg-black/70 flex justify-center items-end z-50">

            <div className="w-full max-w-[420px] h-[70%] bg-[#0f0f0f] border-t border-white/10 rounded-t-2xl p-4 overflow-y-scroll">

              <div className="text-center font-semibold mb-3 text-white">
                Select Sound
              </div>

              {sounds.map(sound => (
                <div
                  key={sound.id}
                  onClick={() => {
                    setTrackName(sound.track_name);
                    setArtistName(sound.artist_name);
                    setShowSounds(false);
                  }}
                  className="py-3 border-b border-white/10 cursor-pointer flex items-center gap-3 active:bg-white/10 transition-colors rounded-lg px-2"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                    {sound.thumbnail_url ? (
                      <img
                        src={sound.thumbnail_url}
                        alt={sound.track_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white text-xs">
                        ♫
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-white">{sound.track_name}</div>
                    <div className="text-xs text-gray-400">{sound.artist_name}</div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setShowSounds(false)}
                className="mt-4 w-full py-2 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-white/20 active:bg-white/30 transition-colors"
              >
                Close
              </button>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}