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
      const { data } = await supabase.auth.getUser();
      const authUser = data.user;

      setUser(authUser);

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
      setLoading(false);
    };

    loadUser();
  }, []);

  return {
    user,
    profile,
    loading,
  };
};