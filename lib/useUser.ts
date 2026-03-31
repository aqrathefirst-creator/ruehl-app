'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
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

  useEffect(() => {
    const loadUser = async () => {
      const cachedUser = sessionStorage.getItem('ruehl:user');
      const cachedProfile = sessionStorage.getItem('ruehl:profile');

      if (cachedUser) {
        setUser(JSON.parse(cachedUser) as User);
      }

      if (cachedProfile) {
        setProfile(JSON.parse(cachedProfile) as UserProfile);
      }

      const { data } = await supabase.auth.getUser();
      const authUser = data.user;

      setUser(authUser);

      if (authUser) {
        sessionStorage.setItem('ruehl:user', JSON.stringify(authUser));
      } else {
        sessionStorage.removeItem('ruehl:user');
        sessionStorage.removeItem('ruehl:profile');
      }

      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      setProfile(profileData || null);
      if (profileData) {
        sessionStorage.setItem('ruehl:profile', JSON.stringify(profileData));
      }
      setLoading(false);
    };

    loadUser();

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      void loadUser();
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    profile,
    loading,
  };
};