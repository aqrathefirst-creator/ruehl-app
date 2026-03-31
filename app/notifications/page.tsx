'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import VerificationBadge from '@/components/VerificationBadge';

type Notification = {
  id: string;
  type: string;
  actor_id: string;
  read: boolean;
  user_id: string;
  target_id?: string | null;
  post_id?: string | null;
  target_post_id?: string | null;
  created_at?: string;
};

type Profile = {
  id: string;
  username: string;
  avatar_url?: string | null;
  verified?: boolean;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  // INITIAL LOAD
  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      setCurrentUser(user);

      if (!user) return;

      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, verified');

      setNotifications(notifData || []);
      setProfiles(profilesData || []);
    };

    init();
  }, []);

  // 🔥 REALTIME LISTENER
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;

          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const getProfile = (id: string) =>
    profiles.find((p) => p.id === id);

  const getNotificationIcon = (type: string) => {
    if (type === 'follow') return '👤';
    if (type === 'like') return '❤️';
    if (type === 'comment') return '💬';
    return '🔔';
  };

  const renderText = (n: Notification) => {
    if (n.type === 'follow') return `followed you`;
    if (n.type === 'like') return `liked your post`;
    if (n.type === 'comment') return `commented on your post`;
    if (n.type === 'lift') return `lifted your post`;
    return 'New notification';
  };

  const exitNotifications = () => {
    if (navigator.vibrate) navigator.vibrate(6);
    router.push('/');
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications((prev) => prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item)));
    await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
  };

  const openNotification = async (notification: Notification) => {
    if (navigator.vibrate) navigator.vibrate(6);
    await markAsRead(notification.id);

    if (notification.type === 'follow') {
      router.push(`/profile/${notification.actor_id}`);
      return;
    }

    const postId = notification.post_id || notification.target_post_id || notification.target_id;
    if (!postId) {
      router.push(`/profile/${notification.actor_id}`);
      return;
    }

    const { data: post } = await supabase
      .from('posts')
      .select('id, media_url')
      .eq('id', postId)
      .maybeSingle();

    if (!post?.id) {
      router.push(`/profile/${notification.actor_id}`);
      return;
    }

    if (post.media_url) {
      router.push(`/now?post=${post.id}${notification.type === 'comment' ? '&comments=1' : ''}`);
      return;
    }

    router.push(`/?post=${post.id}${notification.type === 'comment' ? '&comments=1' : ''}`);
  };

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!swipeStartRef.current) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - swipeStartRef.current.x;
    const deltaY = touch.clientY - swipeStartRef.current.y;
    swipeStartRef.current = null;

    if (deltaX > 90 || deltaY > 90) {
      exitNotifications();
    }
  };

  return (
    <div className="flex justify-center min-h-screen bg-black" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="w-full max-w-[430px] bg-black text-white pb-32">

        {/* HEADER */}
        <div className="sticky top-0 z-30 bg-black/80 backdrop-blur border-b border-white/10">
          <div className="px-6 py-2">
            <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-white/20" />
          </div>
          <div className="px-6 pb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black">Activity</h1>
              <p className="text-xs text-gray-500 mt-0.5">Stay updated • swipe right/down to close</p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold">
              🔔 {notifications.filter((n) => !n.read).length} unread
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-2">

          {notifications.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">No notifications yet</p>
            </div>
          )}

          {notifications.map((n) => {
            const actor = getProfile(n.actor_id);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => void openNotification(n)}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                  !n.read
                    ? 'bg-purple-500/10 border-purple-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                {actor?.avatar_url ? (
                  <img src={actor.avatar_url} alt={`${actor.username || 'User'} avatar`} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white flex items-center gap-1">
                    {actor?.username || 'User'}
                    {actor?.verified && <VerificationBadge />}
                  </p>
                  <p className="text-sm text-gray-400 mt-0.5">{renderText(n)}</p>
                </div>
                <span className="text-lg flex-shrink-0">{getNotificationIcon(n.type)}</span>
              </button>
            );
          })}

        </div>
      </div>
    </div>
  );
}