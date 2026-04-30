'use client';

import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type UserProfile = {
  id: string;
  username: string;
  avatar_url?: string | null;
  verified?: boolean;
};

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [banned, setBanned] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    let mounted = true;

    const hydrateFromSession = async (session: Session | null) => {
      const authUser = session?.user ?? null;
      setUser(authUser);

      if (authUser) {
        sessionStorage.setItem('ruehl:user', JSON.stringify(authUser));
      } else {
        sessionStorage.removeItem('ruehl:user');
        sessionStorage.removeItem('ruehl:profile');
      }

      if (!authUser) {
        setProfile(null);
        setBanned(false);
        setDeleted(false);
        if (mounted) setLoading(false);
        return;
      }

      const [{ data: profileData }, bannedResult, deletedResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', authUser.id).single(),
        supabase.rpc('is_user_banned', { uid: authUser.id }),
        supabase.rpc('is_user_deleted', { uid: authUser.id }),
      ]);

      if (!mounted) return;

      setBanned(!bannedResult.error && Boolean(bannedResult.data));
      setDeleted(!deletedResult.error && Boolean(deletedResult.data));

      setProfile(profileData || null);
      if (profileData) {
        sessionStorage.setItem('ruehl:profile', JSON.stringify(profileData));
      }
      if (mounted) setLoading(false);
    };

    const cachedUser = sessionStorage.getItem('ruehl:user');
    const cachedProfile = sessionStorage.getItem('ruehl:profile');

    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser) as User);
      } catch {
        sessionStorage.removeItem('ruehl:user');
      }
    }

    if (cachedProfile) {
      try {
        setProfile(JSON.parse(cachedProfile) as UserProfile);
      } catch {
        sessionStorage.removeItem('ruehl:profile');
      }
    }

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      void hydrateFromSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      // Includes TOKEN_REFRESHED — re-check ban/deleted after live moderation / token rotation.
      void hydrateFromSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    profile,
    loading,
    banned,
    deleted,
  };
};
