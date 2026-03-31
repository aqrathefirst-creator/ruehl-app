'use client'
/* eslint-disable react-hooks/immutability */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

type Post = {
  id: string
  user_id: string
  media_url?: string | null
  content?: string | null
}

type Profile = {
  id: string
  username?: string | null
}

type Sound = {
  id: string
  track_name?: string | null
}

type AuthUser = {
  id: string
}

export default function SoundPage() {
  const params = useParams()
  const id = params?.id as string | undefined
  const router = useRouter()

  const [posts, setPosts] = useState<Post[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [sound, setSound] = useState<Sound | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      void init()
    }, 0)

    return () => clearTimeout(timer)
  }, [id])

  async function init() {
    const { data } = await supabase.auth.getUser()
    setUser((data.user as AuthUser | null) || null)

    if (!id) return

    const { data: soundData } = await supabase
      .from('sounds')
      .select('*')
      .eq('id', id)
      .single()

    setSound(soundData)

    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('sound_id', id)
      .order('created_at', { ascending: false })

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')

    setPosts(postsData || [])
    setProfiles(profilesData || [])

    if (data.user) {
      const { data: existing } = await supabase
        .from('saved_sounds')
        .select('*')
        .eq('user_id', data.user.id)
        .eq('sound_id', id)
        .single()

      setSaved(!!existing)
    }
  }

  const toggleSave = async () => {
    if (!user) return

    if (saved) {
      await supabase
        .from('saved_sounds')
        .delete()
        .eq('user_id', user.id)
        .eq('sound_id', id)

      setSaved(false)
    } else {
      await supabase.from('saved_sounds').insert({
        user_id: user.id,
        sound_id: id,
      })

      setSaved(true)
    }
  }

  const getProfile = (userId: string) =>
    profiles.find(p => p.id === userId)

  return (
    <div className="w-full min-h-screen bg-white flex justify-center">

      {/* MOBILE FRAME */}
      <div className="w-full max-w-[420px] h-[100dvh] overflow-y-scroll snap-y snap-mandatory relative bg-black">

        {/* TOP BAR */}
        <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center px-4 py-4 text-white text-sm">

          <button onClick={() => router.back()}>
            Back
          </button>

          <div className="text-center">
            <div className="text-xs opacity-70">
              🎵 Sound
            </div>
            <div className="font-semibold text-sm">
              {sound?.track_name}
            </div>
          </div>

          <button
            onClick={toggleSave}
            className="text-xs border border-white/40 px-3 py-1 rounded-full"
          >
            {saved ? 'Saved' : 'Save'}
          </button>

        </div>

        {/* POSTS */}
        {posts.map(post => {
          const user = getProfile(post.user_id)

          return (
            <div
              key={post.id}
              className="h-[100dvh] w-full snap-start relative flex items-center justify-center"
            >

              {/* MEDIA */}
              {post.media_url && (
                <div className="absolute inset-0">
                  <img
                    src={post.media_url}
                    alt="Sound post media"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* OVERLAY */}
              <div className="absolute inset-0 bg-black/30" />

              {/* USER + CAPTION */}
              <div className="absolute bottom-10 left-4 right-20 text-white space-y-2">

                <div
                  className="font-semibold cursor-pointer"
                  onClick={() => router.push(`/profile/${user?.id}`)}
                >
                  @{user?.username}
                </div>

                <div className="text-sm">
                  {post.content}
                </div>

              </div>

            </div>
          )
        })}

        {posts.length === 0 && (
          <div className="h-[100dvh] flex items-center justify-center text-white">
            No posts using this sound yet
          </div>
        )}

      </div>

    </div>
  )
}