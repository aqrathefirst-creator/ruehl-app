'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function EditProfile() {
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;

      if (!currentUser) return;

      setUser(currentUser);

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();

      if (profile) {
        setFullName(typeof profile.full_name === 'string' ? profile.full_name : '');
        setUsername(profile.username || '');
        setBio(profile.bio || '');
        setAvatarUrl(profile.avatar_url || '');
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveError(null);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        username,
        bio,
        avatar_url: avatarUrl,
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      console.error('Failed to save profile:', error);
      setSaveError(error.message || 'Could not save profile');
      return;
    }

    const slug = String(username || '').trim().replace(/^@+/, '');
    router.push(slug ? `/${encodeURIComponent(slug)}` : `/profile/${user.id}`);
  };

  const displayHandle = String(username || 'username').replace(/^@+/, '');

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4">
      <div className="px-2 py-4">
        <h1 className="text-3xl font-black">Edit Profile</h1>
        <p className="mt-1 text-sm text-gray-500">Update your information</p>
      </div>

      {/* PREVIEW */}
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm">
        {avatarUrl && (
          <div className="mx-auto h-20 w-20 overflow-hidden rounded-full bg-gray-200">
            <img src={avatarUrl} alt="Profile avatar preview" className="h-full w-full object-cover" />
          </div>
        )}
        <div>
          <p className="text-lg font-bold text-gray-900">@{displayHandle}</p>
          {fullName.trim() ? <p className="text-base font-normal text-gray-700">{fullName.trim()}</p> : null}
          <p className="text-sm text-gray-500">{bio || 'No bio yet'}</p>
        </div>
      </div>

      {/* FORM */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        {saveError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</div>
        ) : null}

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-gray-900">Name</span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            maxLength={64}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <span className="mt-1 block text-xs text-gray-500">Display name shown below your username.</span>
        </label>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-900">Avatar URL</label>
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="https://example.com/avatar.jpg"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-900">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Your username"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-900">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Tell us about yourself"
            rows={4}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-900 transition-colors hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
