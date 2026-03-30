'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useMemo } from 'react';
import { supabase, processMedia } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import VerificationBadge from '@/components/VerificationBadge';

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio?: string | null;
  verified?: boolean;
};

type Post = {
  id: string;
  content: string;
  media_url?: string | null;
  media_urls?: string[] | null;
  user_id: string;
};

export default function Page() {
  const params = useParams();
  const userId = params?.id as string;

  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [likes, setLikes] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [listType, setListType] = useState<'followers' | 'following' | null>(null);

  const [activePost, setActivePost] = useState<Post | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [gridCommentInputs, setGridCommentInputs] = useState<Record<string, string>>({});

  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);

  const [tab, setTab] = useState<'grid' | 'powr'>('grid');
  const [powrPosts, setPowrPosts] = useState<any[]>([]);
  const [powrLikes, setPowrLikes] = useState<any[]>([]);
  const [powrReplies, setPowrReplies] = useState<any[]>([]);
  const [replyInputs, setReplyInputs] = useState<any>({});
  const [newPowr, setNewPowr] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [commentScroll, setCommentScroll] = useState(0);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [localAvatarPreview, setLocalAvatarPreview] = useState<string | null>(null);
  const [avatarCropOpen, setAvatarCropOpen] = useState(false);
  const [avatarCropSource, setAvatarCropSource] = useState<string | null>(null);
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [retryAvatarFile, setRetryAvatarFile] = useState<File | null>(null);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);

  const [showCreateMenu, setShowCreateMenu] = useState(false); // ✅ ADDED

  const [activity] = useState({
    last: 'Strength Training',
    streak: 6,
    focus: ['Fitness', 'Discipline'],
  });

  const fetchData = async () => {
    const { data: userData } = await supabase.auth.getUser();
    setCurrentUser(userData.user);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: allProfilesData } = await supabase
      .from('profiles')
      .select('*');

    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId);

    const { data: commentsData } = await supabase.from('comments').select('*');
    const { data: likesData } = await supabase.from('likes').select('*');

    const { data: followersData } = await supabase
      .from('follows')
      .select('*')
      .eq('following_id', userId);

    const { data: followingData } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', userId);

    const { data: powrData } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .is('media_url', null)
      .order('created_at', { ascending: false });

    setProfile(profileData);
    setAllProfiles(allProfilesData || []);
    setPosts(postsData || []);
    setComments(commentsData || []);
    setLikes(likesData || []);
    setFollowers(followersData || []);
    setFollowing(followingData || []);
    setPowrPosts(powrData || []);
    setPowrLikes([]);
    setPowrReplies([]);

    if (userData.user) {
      const { data: followData } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', userData.user.id)
        .eq('following_id', userId)
        .single();

      setIsFollowing(!!followData);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('comments')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'comments' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    return () => {
      if (localAvatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(localAvatarPreview);
      }
    };
  }, [localAvatarPreview]);

  useEffect(() => {
    return () => {
      if (avatarCropSource?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarCropSource);
      }
    };
  }, [avatarCropSource]);

  const debounce = <T extends (...args: any[]) => void>(fn: T, delay = 100) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const handleCommentScroll = (event: React.UIEvent<HTMLDivElement>) => {
    setCommentScroll(event.currentTarget.scrollTop);
  };

  const debouncedHandleCommentScroll = debounce(handleCommentScroll, 80);

  const getUserProfile = (userId: string) =>
    allProfiles.find((p) => p.id === userId);

  const getPowrPostLikes = (postId: string) =>
    likes.filter((l: any) => l.post_id === postId).length;

  const getPowrPostComments = (postId: string) =>
    comments.filter((c: any) => c.post_id === postId);

  const hasPowrLiked = (postId: string) =>
    likes.some((l: any) => l.post_id === postId && l.user_id === currentUser?.id);

  const parseMediaUrls = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string' && !!item);
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === 'string' && !!item);
        }
      } catch {
        return [];
      }
    }

    return [];
  };

  const getPostMediaItems = (post: Post): string[] => {
    const multi = parseMediaUrls(post.media_urls);
    if (multi.length > 0) return multi;
    if (post.media_url) return [post.media_url];
    return [];
  };

  const isVideoUrl = (url: string) => /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);

  const getGridPostLikes = (postId: string) =>
    likes.filter((l: any) => l.post_id === postId).length;

  const getGridPostComments = (postId: string) =>
    comments.filter((c: any) => c.post_id === postId);

  const hasGridLiked = (postId: string) =>
    likes.some((l: any) => l.post_id === postId && l.user_id === currentUser?.id);

  const toggleGridLike = async (postId: string) => {
    if (!currentUser) return;

    const existing = likes.find(
      (l: any) => l.post_id === postId && l.user_id === currentUser.id
    );

    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('likes').insert({
        user_id: currentUser.id,
        post_id: postId,
      });
    }

    fetchData();
  };

  const addGridComment = async (postId: string) => {
    const content = gridCommentInputs[postId];
    if (!content?.trim() || !currentUser) return;

    await supabase.from('comments').insert({
      content,
      user_id: currentUser.id,
      post_id: postId,
    });

    setGridCommentInputs(prev => ({ ...prev, [postId]: '' }));
    fetchData();
  };

  const shareGridPost = async (postId: string) => {
    const postUrl = `${window.location.origin}/profile/${userId}?post=${postId}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'RUEHL Post', url: postUrl });
        return;
      } catch {
        // Fall back to clipboard if share sheet is dismissed/unavailable.
      }
    }

    try {
      await navigator.clipboard.writeText(postUrl);
      alert('Post link copied to clipboard.');
    } catch {
      alert('Unable to share right now.');
    }
  };

  const togglePowrLike = async (postId: string) => {
    if (!currentUser) return;

    const existing = likes.find(
      (l: any) => l.post_id === postId && l.user_id === currentUser.id
    );

    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('likes').insert({
        user_id: currentUser.id,
        post_id: postId,
      });
    }

    fetchData();
  };

  const addPowrComment = async (postId: string) => {
    const content = replyInputs[postId];
    if (!content?.trim() || !currentUser) return;

    await supabase.from('comments').insert({
      content,
      user_id: currentUser.id,
      post_id: postId,
    });

    setReplyInputs((prev: any) => ({ ...prev, [postId]: '' }));
    fetchData();
  };

  const editPowrComment = async (commentId: string) => {
    if (!editingCommentText.trim() || !currentUser) return;

    await supabase
      .from('comments')
      .update({ content: editingCommentText })
      .eq('id', commentId);

    setEditingCommentId(null);
    setEditingCommentText('');
    fetchData();
  };

  const startEditComment = (commentId: string, body: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(body);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const deletePowrComment = async (commentId: string, userId: string) => {
    if (!currentUser || currentUser.id !== userId) return;

    await supabase.from('comments').delete().eq('id', commentId);
    fetchData();
  };

  const createPowrPost = async () => {
    if (!newPowr.trim() || !currentUser) return;

    await supabase.from('posts').insert({
      user_id: currentUser.id,
      content: newPowr,
      media_url: null,
      created_at: new Date().toISOString(),
    });

    setNewPowr('');
    fetchData();
  };

  const buildCroppedAvatarFile = async (file: File, zoom: number) => {
    const imageUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      const size = 720;
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to create canvas context');

      const base = Math.min(image.width, image.height);
      const cropSize = base / Math.max(1, zoom);
      const sx = (image.width - cropSize) / 2;
      const sy = (image.height - cropSize) / 2;

      ctx.drawImage(image, sx, sy, cropSize, cropSize, 0, 0, size, size);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.95);
      });

      if (!blob) throw new Error('Failed to create cropped image');

      return new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
        type: 'image/jpeg',
      });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const uploadAvatarFile = async (file: File, previewUrl?: string) => {
    if (!currentUser || currentUser.id !== userId) return;

    if (previewUrl) {
      setLocalAvatarPreview(prev => {
        if (prev && prev !== previewUrl && prev.startsWith('blob:')) {
          URL.revokeObjectURL(prev);
        }
        return previewUrl;
      });
    }

    setAvatarUploading(true);
    setAvatarUploadError(null);
    setRetryAvatarFile(file);

    try {
      const finalFile = await processMedia(file);
      const fileExt = finalFile.name.split('.').pop() || 'jpg';
      const filePath = `avatars/${currentUser.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, finalFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const avatarUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;

      setProfile(prev => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
      setAllProfiles(prev =>
        prev.map(p => (p.id === currentUser.id ? { ...p, avatar_url: avatarUrl } : p))
      );

      localStorage.setItem('ruehl:avatar-url', avatarUrl);
      localStorage.setItem('ruehl:avatar-updated-at', Date.now().toString());
      window.dispatchEvent(
        new CustomEvent('ruehl:avatar-updated', {
          detail: { userId: currentUser.id, avatarUrl },
        })
      );

      setRetryAvatarFile(null);
      setLocalAvatarPreview(prev => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (error) {
      console.error('Avatar upload failed:', error);
      setAvatarUploadError('Upload failed. Retry?');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;
    if (!currentUser || currentUser.id !== userId) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    setAvatarUploadError(null);
    setPendingAvatarFile(file);
    setAvatarZoom(1);
    setAvatarCropSource(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setAvatarCropOpen(true);
  };

  const confirmAvatarCrop = async () => {
    if (!pendingAvatarFile) return;

    try {
      const croppedFile = await buildCroppedAvatarFile(pendingAvatarFile, avatarZoom);
      const previewUrl = URL.createObjectURL(croppedFile);

      setAvatarCropOpen(false);
      setPendingAvatarFile(null);
      setAvatarCropSource(prev => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });

      await uploadAvatarFile(croppedFile, previewUrl);
    } catch (error) {
      console.error('Avatar crop failed:', error);
      alert('Failed to crop image. Please try again.');
    }
  };

  const cancelAvatarCrop = () => {
    setAvatarCropOpen(false);
    setPendingAvatarFile(null);
    setAvatarCropSource(prev => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    setAvatarZoom(1);
  };

  const toggleFollow = async () => {
    if (!currentUser || currentUser.id === userId) return;

    setLoadingFollow(true);

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId);

      setIsFollowing(false);
    } else {
      await supabase.from('follows').insert({
        follower_id: currentUser.id,
        following_id: userId,
      });

      setIsFollowing(true);
    }

    setLoadingFollow(false);
  };

  const gridPosts = useMemo(
    () => posts.filter(p => getPostMediaItems(p).length > 0),
    [posts]
  );
  const mediaPosts = useMemo(
    () =>
      gridPosts.map(post => {
        const mediaItems = getPostMediaItems(post);
        const isVideo = mediaItems.length > 0 ? isVideoUrl(mediaItems[0]) : false;
        return { ...post, isVideo, mediaItems };
      }),
    [gridPosts]
  );

  if (!profile) return <div>Loading...</div>;

  return (
    <div className="flex justify-center min-h-screen bg-black">
      <div className="w-full max-w-[430px] bg-black text-white pb-32">

        {/* HEADER SECTION */}
        <div className="px-6 pt-4 pb-8">

          {/* TOP ACTION BUTTONS */}
          <div className="flex justify-end gap-3 mb-6">
            {currentUser?.id === userId && (
              <>
                <button
                  onClick={() => router.push('/settings')}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:bg-white/30"
                >
                  ⚙️
                </button>
                <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:bg-white/30">
                  ↗️
                </button>
              </>
            )}
          </div>

          {/* PROFILE INFO */}
          <div className="flex gap-4 items-start">
            {/* AVATAR */}
            <div className="relative">
              <label
                className={`block w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-1 flex-shrink-0 ${
                  currentUser?.id === userId ? 'cursor-pointer' : ''
                }`}
              >
                {profile.avatar_url ? (
                  <div className="w-full h-full rounded-full overflow-hidden bg-black relative">
                    <img
                      src={localAvatarPreview || profile.avatar_url}
                      className="w-full h-full object-cover"
                    />
                    {currentUser?.id === userId && (
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/35 active:bg-black/45 transition-colors" />
                    )}
                    {avatarUploading && (
                      <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-white/35 border-t-white animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-700 relative">
                    {localAvatarPreview && (
                      <img
                        src={localAvatarPreview}
                        className="w-full h-full object-cover rounded-full"
                      />
                    )}
                    {currentUser?.id === userId && (
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/35 active:bg-black/45 transition-colors rounded-full" />
                    )}
                    {avatarUploading && (
                      <div className="absolute inset-0 bg-black/55 flex items-center justify-center rounded-full">
                        <div className="w-8 h-8 rounded-full border-2 border-white/35 border-t-white animate-spin" />
                      </div>
                    )}
                  </div>
                )}
                {currentUser?.id === userId && (
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={avatarUploading}
                  />
                )}
              </label>
              {currentUser?.id === userId && (
                <div className="text-[10px] text-center text-gray-500 mt-1">
                  {avatarUploading ? 'Saving...' : 'Tap to change'}
                </div>
              )}
              {currentUser?.id === userId && avatarUploadError && retryAvatarFile && !avatarUploading && (
                <button
                  onClick={async () => {
                    const preview = localAvatarPreview || URL.createObjectURL(retryAvatarFile);
                    await uploadAvatarFile(retryAvatarFile, preview);
                  }}
                  className="mt-1 w-full text-[10px] rounded-md bg-red-500/15 border border-red-500/35 text-red-300 py-1"
                >
                  Retry Upload
                </button>
              )}
            </div>

            {/* INFO */}
            <div className="flex-1 pt-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold">@{profile.username}</span>
                {profile.verified && <VerificationBadge />}
              </div>
              <div className="text-sm text-gray-400">
                {profile.bio || 'No bio yet'}
              </div>
            </div>
          </div>

          {/* STATS - LARGE AND BOLD */}
          <div className="flex gap-8 mt-8">
            <div>
              <div className="text-3xl font-black">{posts.length}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Posts</div>
            </div>
            <button
              onClick={() => router.push(`/followers/${userId}`)}
              className="text-left active:opacity-80 transition-opacity"
            >
              <div className="text-3xl font-black">{followers.length}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Followers</div>
            </button>
            <button
              onClick={() => router.push(`/following/${userId}`)}
              className="text-left active:opacity-80 transition-opacity"
            >
              <div className="text-3xl font-black">{following.length}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Following</div>
            </button>
          </div>

          {/* CURRENT SOUND CARD */}
          <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur active:bg-white/10 transition-colors">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Current Sound</div>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-500 to-pink-500 flex-shrink-0 flex items-center justify-center text-2xl">
                ♫
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white">Unstoppable</div>
                <div className="text-sm text-gray-400">Sia</div>
              </div>
              <button className="px-3 py-2 rounded-full bg-green-500/20 text-green-400 text-xs font-medium hover:bg-green-500/30 active:bg-green-500/40 transition-colors flex-shrink-0">
                Open ↗
              </button>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-2 mt-6 justify-center">
            <button className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-sm transition-colors touch-highlight-trasparent">
              Edit Profile
            </button>
            <button className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-sm transition-colors">
              Share Profile
            </button>
            {currentUser?.id === userId && (
              <button
                onClick={() => setShowCreateMenu(!showCreateMenu)}
                className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold hover:shadow-lg active:shadow-md transition-all relative"
              >
                + Create
              </button>
            )}
          </div>

        </div>

        {/* MOMENTS HEADER */}
        <div className="px-6 py-6 flex items-center justify-between border-t border-white/10">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Moments</div>
          <button className="text-sm text-green-400 font-semibold hover:text-green-300 active:text-green-500 transition-colors">
            + Add
          </button>
        </div>

        {/* GRID / POWR TABS */}
        <div className="px-6 flex gap-6 border-b border-white/10">
          <button
            onClick={() => setTab('grid')}
            className={`pb-4 text-sm font-semibold transition-colors ${
              tab === 'grid' ? 'text-white border-b-2 border-white' : 'text-gray-500'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setTab('powr')}
            className={`pb-4 text-sm font-semibold transition-colors ${
              tab === 'powr' ? 'text-white border-b-2 border-white' : 'text-gray-500'
            }`}
          >
            POWR
          </button>
        </div>

        {/* GRID TAB */}
        {tab === 'grid' && (
          <div className="px-6 pt-4">
            <div className="grid grid-cols-3 gap-1">
              {mediaPosts.map(post => (
                <button
                  key={post.id}
                  onClick={() => {
                    setActivePost(post);
                    setActiveMediaIndex(0);
                  }}
                  className="relative group cursor-pointer overflow-hidden rounded-lg active:opacity-75 transition-opacity"
                >
                  {post.isVideo ? (
                    <video
                      src={post.mediaItems[0]}
                      onMouseEnter={e => {
                        const target = e.currentTarget as HTMLVideoElement;
                        target.play().catch(() => {});
                      }}
                      onMouseLeave={e => {
                        const target = e.currentTarget as HTMLVideoElement;
                        target.pause();
                        target.currentTime = 0;
                      }}
                      className="aspect-square object-cover"
                      muted
                      playsInline
                      loop
                    />
                  ) : (
                    <img
                      src={post.mediaItems[0]}
                      className="aspect-square object-cover"
                    />
                  )}
                  {post.mediaItems.length > 1 && (
                    <div className="absolute top-1.5 right-1.5 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {activePost?.id === post.id ? activeMediaIndex + 1 : 1}/{post.mediaItems.length}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 group-active:bg-black/50 transition-colors flex items-center justify-center">
                    <div className="text-white text-3xl opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                      {post.isVideo ? '▶' : post.mediaItems.length > 1 ? '▦' : '🖼'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* POWR TAB */}
        {tab === 'powr' && (
          <div className="px-6 py-4 space-y-6">

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur active:bg-white/10 transition-colors">
              <textarea
                value={newPowr}
                onChange={(e) => setNewPowr(e.target.value)}
                placeholder="Share something..."
                className="w-full mb-3 p-3 rounded-lg bg-white/10 border border-white/20 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white placeholder:text-gray-500 text-sm resize-none"
                rows={3}
              />
              <button
                onClick={createPowrPost}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg active:shadow-md text-white font-semibold rounded-lg transition-all"
              >
                Post
              </button>
            </div>

            {powrPosts.map(p => {
              const postComments = getPowrPostComments(p.id);
              const liked = hasPowrLiked(p.id);
              const author = getUserProfile(p.user_id);

              return (
                <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur space-y-4">
                  <div className="flex items-start gap-3">
                    {author?.avatar_url ? (
                      <img
                        src={author.avatar_url}
                        alt={author.username}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-white flex items-center gap-1">
                        {author?.username || (p.user_id === currentUser?.id ? 'You' : 'User')}
                        {author?.verified && <VerificationBadge />}
                      </div>
                      <div className="text-xs text-gray-500">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-100 leading-relaxed">{p.content}</p>

                  <div className="flex gap-6 text-gray-400">
                    <button
                      onClick={() => togglePowrLike(p.id)}
                      className="flex items-center gap-2 text-sm hover:text-red-500 active:text-red-600 transition-colors group"
                    >
                      <span className={`text-lg ${liked ? 'text-red-500' : 'text-gray-500'}`}>
                        {liked ? '♥' : '♡'}
                      </span>
                      <span>{getPowrPostLikes(p.id)}</span>
                    </button>
                    <button className="flex items-center gap-2 text-sm hover:text-purple-500 active:text-purple-600 transition-colors">
                      <span className="text-lg">💬</span>
                      <span>{postComments.length}</span>
                    </button>
                  </div>

                  {postComments.length > 0 && (
                    <div className="space-y-3 bg-white/5 rounded-lg p-3 border border-white/10">
                      <p className="text-xs font-semibold text-gray-400">Comments ({postComments.length})</p>
                      <div className="space-y-2">
                        {postComments.slice(0, 3).map((c: any) => {
                          const commentAuthor = getUserProfile(c.user_id);
                          return (
                            <div key={c.id} className="bg-white/5 rounded-lg p-2.5">
                              <div className="flex items-center gap-1 mb-1">
                                <b className="text-sm font-semibold text-white flex items-center gap-1">
                                  {commentAuthor?.username || (c.user_id === currentUser?.id ? 'You' : 'User')}
                                  {commentAuthor?.verified && <VerificationBadge />}
                                </b>
                              </div>
                              <p className="text-sm text-gray-300">{c.content}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-white/10">
                    <input
                      value={replyInputs[p.id] || ''}
                      onChange={e =>
                        setReplyInputs((prev: any) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                      className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 focus:border-purple-500 text-white text-sm placeholder:text-gray-500"
                      placeholder="Add a comment..."
                    />
                    <button
                      onClick={() => addPowrComment(p.id)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:shadow-lg active:shadow-md transition-all"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              );
            })}

          </div>
        )}

        {/* AVATAR CROP MODAL */}
        {avatarCropOpen && avatarCropSource && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-[380px] bg-[#101010] border border-white/10 rounded-2xl p-4">
              <div className="text-sm font-semibold text-white mb-3">Adjust Profile Photo</div>
              <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black mb-3">
                <img
                  src={avatarCropSource}
                  className="w-full h-full object-cover"
                  style={{ transform: `scale(${avatarZoom})` }}
                />
              </div>
              <div className="mb-4">
                <div className="text-[11px] text-gray-400 mb-1">Zoom</div>
                <input
                  type="range"
                  min={1}
                  max={2.5}
                  step={0.05}
                  value={avatarZoom}
                  onChange={(e) => setAvatarZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={cancelAvatarCrop}
                  className="py-2 rounded-xl bg-white/10 text-white border border-white/15"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAvatarCrop}
                  className="py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* POST VIEWER MODAL */}
        {activePost && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setActivePost(null)}
          >
            <div
              className="w-full max-w-[430px] bg-black rounded-2xl overflow-hidden relative"
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const activePostMedia = getPostMediaItems(activePost);
                const activePostComments = getGridPostComments(activePost.id);
                const activePostLiked = hasGridLiked(activePost.id);
                const activePostLikeCount = getGridPostLikes(activePost.id);

                return (
                  <>
              <button
                onClick={() => setActivePost(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-lg z-10 active:bg-white/40"
              >
                ×
              </button>
                    {activePostMedia.length > 1 ? (
                      <div
                        className="w-full overflow-x-auto snap-x snap-mandatory flex"
                        onScroll={(event) => {
                          const width = event.currentTarget.clientWidth;
                          if (!width) return;
                          const index = Math.round(event.currentTarget.scrollLeft / width);
                          setActiveMediaIndex(Math.max(0, Math.min(activePostMedia.length - 1, index)));
                        }}
                      >
                        {activePostMedia.map((url) => (
                          <div key={url} className="w-full shrink-0 snap-center">
                            <img src={url} className="w-full max-h-[60vh] object-contain" />
                          </div>
                        ))}
                      </div>
                    ) : activePostMedia[0] ? (
                      isVideoUrl(activePostMedia[0]) ? (
                        <video
                          src={activePostMedia[0]}
                          className="w-full max-h-[60vh] object-contain"
                          controls
                          autoPlay
                          playsInline
                        />
                      ) : (
                        <img src={activePostMedia[0]} className="w-full max-h-[60vh] object-contain" />
                      )
                    ) : null}

                    {activePostMedia.length > 1 && (
                      <div className="px-4 pt-3 text-center text-xs text-gray-400">
                        {activeMediaIndex + 1} / {activePostMedia.length} • Swipe to view
                      </div>
                    )}

                    {(activePost.content || activePostLikeCount > 0 || activePostComments.length > 0) && (
                      <div className="p-4 space-y-3 border-t border-white/10">
                        {activePost.content && (
                          <div className="text-white text-sm leading-relaxed">{activePost.content}</div>
                        )}

                        <div className="flex items-center gap-6 text-gray-300">
                          <button
                            onClick={() => toggleGridLike(activePost.id)}
                            className="flex items-center gap-2 text-sm active:opacity-75"
                          >
                            <span className={`text-lg ${activePostLiked ? 'text-red-500' : 'text-gray-400'}`}>
                              {activePostLiked ? '♥' : '♡'}
                            </span>
                            <span>{activePostLikeCount}</span>
                          </button>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="text-lg">💬</span>
                            <span>{activePostComments.length}</span>
                          </div>
                          <button
                            onClick={() => shareGridPost(activePost.id)}
                            className="flex items-center gap-2 text-sm text-gray-300 active:opacity-75"
                          >
                            <span className="text-base">↗</span>
                            <span>Share</span>
                          </button>
                        </div>

                        {activePostComments.length > 0 && (
                          <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3 max-h-44 overflow-y-auto">
                            {activePostComments.slice(0, 6).map((comment: any) => {
                              const commentAuthor = getUserProfile(comment.user_id);
                              return (
                                <div key={comment.id} className="text-sm">
                                  <span className="font-semibold text-white mr-1">
                                    {commentAuthor?.username || (comment.user_id === currentUser?.id ? 'You' : 'User')}
                                  </span>
                                  <span className="text-gray-300">{comment.content}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <input
                            value={gridCommentInputs[activePost.id] || ''}
                            onChange={e =>
                              setGridCommentInputs(prev => ({
                                ...prev,
                                [activePost.id]: e.target.value,
                              }))
                            }
                            placeholder="Add a comment..."
                            className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500"
                          />
                          <button
                            onClick={() => addGridComment(activePost.id)}
                            className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white active:opacity-80"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* CREATE MENU DROPDOWN */}
        {showCreateMenu && (
          <div className="fixed top-20 right-6 w-44 bg-gray-900 border border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur">
            <button
              onClick={() => {
                router.push('/create?type=grid');
                setShowCreateMenu(false);
              }}
              className="block w-full text-left px-4 py-3 hover:bg-white/10 active:bg-white/20 transition-colors"
            >
              Post (Grid)
            </button>
            <button
              onClick={() => {
                router.push('/create?type=powr');
                setShowCreateMenu(false);
              }}
              className="block w-full text-left px-4 py-3 hover:bg-white/10 active:bg-white/20 transition-colors border-t border-white/10"
            >
              Status (POWR)
            </button>
          </div>
        )}

      </div>
    </div>
  );
}