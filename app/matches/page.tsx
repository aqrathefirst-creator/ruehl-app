'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/immutability */

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import VerificationBadge from '@/components/VerificationBadge'

export default function MatchesPage() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const { data } = await supabase.auth.getUser()
    setUser(data.user)

    if (!data.user) return

    const { data: m } = await supabase
      .from('training_matches')
      .select('*')

    setMatches(m || [])

    const { data: p } = await supabase
      .from('profiles')
      .select('*')

    setProfiles(p || [])
  }

  const getOtherUser = (match: any) => {
    if (!user) return null

    return match.user_a === user.id
      ? match.user_b
      : match.user_a
  }

  const getProfile = (id: string) => {
    return profiles.find(p => p.id === id)
  }

  return (
    <div className="flex justify-center min-h-screen bg-black">
      <div className="w-full max-w-[430px] bg-black text-white pb-32">

        {/* HEADER */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <h1 className="text-3xl font-black">Matches</h1>
          <p className="text-sm text-gray-500 mt-1">Find your training partner</p>
        </div>

        <div className="px-4 py-4 space-y-3">

          {matches.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">No matches yet</p>
            </div>
          )}

          {matches.map((m) => {
            const otherId = getOtherUser(m)
            const p = getProfile(otherId)

            return (
              <div key={m.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex gap-4 items-start">
                  {p?.avatar_url ? (
                    <img src={p.avatar_url} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg flex items-center gap-1 text-white">
                      {p?.username || 'User'}
                      {p?.verified && <VerificationBadge />}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {p?.activity_type || 'Training'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/room/${m.id}`)}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl active:shadow-md transition-all"
                >
                  Start Session
                </button>
              </div>
            )
          })}

        </div>
      </div>
    </div>
  )
}