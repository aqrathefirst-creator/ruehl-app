'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import VerificationBadge from '@/components/VerificationBadge';

type Notification = {
  id: string;
  type: string;
  actor_id: string;
  read: boolean;
  user_id: string;
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
        .select('id, username');

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
    return 'New notification';
  };

  return (
    <div className="flex justify-center min-h-screen bg-black">
      <div className="w-full max-w-[430px] bg-black text-white pb-32">

        {/* HEADER */}
        <div className="sticky top-0 z-30 bg-black/80 backdrop-blur border-b border-white/10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black">Activity</h1>
              <p className="text-xs text-gray-500 mt-0.5">Stay updated</p>
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
              <div
                key={n.id}
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
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
}