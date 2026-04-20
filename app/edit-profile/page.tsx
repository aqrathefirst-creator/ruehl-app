'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function EditProfile() {
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const router = useRouter();

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;

      if (!currentUser) return;

      setUser(currentUser);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profile) {
        setUsername(profile.username || '');
        setBio(profile.bio || '');
        setAvatarUrl(profile.avatar_url || '');
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!user) return;

    await supabase
      .from('profiles')
      .update({
        username,
        bio,
        avatar_url: avatarUrl,
      })
      .eq('id', user.id);

    router.push(`/profile/${user.id}`);
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">

      <div className="px-2 py-4">
        <h1 className="text-3xl font-black">Edit Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Update your information</p>
      </div>

      {/* PREVIEW */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center space-y-3 shadow-sm">
        {avatarUrl && (
          <div className="w-20 h-20 rounded-full bg-gray-200 mx-auto overflow-hidden">
            <img src={avatarUrl} alt="Profile avatar preview" className="w-full h-full object-cover" />
          </div>
        )}
        <div>
          <p className="font-bold text-lg text-gray-900">{username}</p>
          <p className="text-sm text-gray-500">{bio || 'No bio yet'}</p>
        </div>
      </div>

      {/* FORM */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-sm">
        {/* Avatar */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Avatar URL</label>
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="https://example.com/avatar.jpg"
          />
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Your username"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            placeholder="Tell us about yourself"
            rows={4}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>

    </div>
  );
}