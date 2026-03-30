'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

type Sound = {
  id: string
  track_name?: string | null
  artist_name?: string | null
}

type SavedSound = {
  sound_id: string
}

export default function SavedSoundsPage() {
  const router = useRouter()
  const [sounds, setSounds] = useState<Sound[]>([])

  async function init() {
    const { data } = await supabase.auth.getUser()

    if (!data.user) return

    const { data: saved } = await supabase
      .from('saved_sounds')
      .select('sound_id')

    const savedRows = (saved || []) as SavedSound[]

    const ids = savedRows.map((s) => s.sound_id)

    if (ids.length === 0) return

    const { data: soundsData } = await supabase
      .from('sounds')
      .select('*')
      .in('id', ids)

    setSounds(soundsData || [])
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void init()
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">

      <h1 className="text-2xl font-bold">Saved Sounds</h1>

      <div className="space-y-3">

        {sounds.map(sound => (
          <div
            key={sound.id}
            onClick={() => router.push(`/sound/${sound.id}`)}
            className="p-4 border rounded-xl cursor-pointer"
          >
            <div className="font-semibold">
              🎵 {sound.track_name}
            </div>
            <div className="text-sm text-gray-500">
              {sound.artist_name}
            </div>
          </div>
        ))}

        {sounds.length === 0 && (
          <p className="text-gray-400 text-sm">
            No saved sounds yet
          </p>
        )}

      </div>

    </div>
  )
}