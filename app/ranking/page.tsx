'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import VerificationBadge from '@/components/VerificationBadge'

type RankedProfile = {
  id: string
  username: string
  avatar_url?: string | null
  verified?: boolean
  activity_type?: string | null
  rank_score?: number | null
}

type AuthUser = {
  id: string
}

export default function RankingPage() {
  const [profiles, setProfiles] = useState<RankedProfile[]>([])
  const [user, setUser] = useState<AuthUser | null>(null)

  async function init() {
    const { data } = await supabase.auth.getUser()
    setUser((data.user as AuthUser | null) || null)

    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .order('rank_score', { ascending: false })
      .limit(100)

    setProfiles(p || [])
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void init()
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  const getRankPosition = (userId: string) => {
    const index = profiles.findIndex(p => p.id === userId)
    return index === -1 ? null : index + 1
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">

      <div className="px-2 py-4">
        <h1 className="text-3xl font-black">Ranking</h1>
        <p className="text-sm text-gray-500 mt-1">Top performers</p>
      </div>

      {/* USER POSITION */}
      {user && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200 p-5">
          <p className="text-sm font-semibold text-gray-600">Your Rank</p>
          <div className="text-4xl font-black text-blue-600 mt-2">
            #{getRankPosition(user.id) || '-'}
          </div>
        </div>
      )}

      {/* TOP USERS */}
      <div>
        <h2 className="text-lg font-bold mb-3 px-2">Leaderboard</h2>
        <div className="space-y-2">

          {profiles.map((p, i) => {
            const medalEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•';
            
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
              >

                <div className="text-2xl w-8 text-center flex-shrink-0">
                  {medalEmoji}
                </div>

                <div className="text-sm font-bold text-gray-600 w-8 flex-shrink-0">
                  #{i + 1}
                </div>

                {p.avatar_url ? (
                  <img
                    src={p.avatar_url}
                    alt={`${p.username} avatar`}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 flex items-center gap-1">
                    {p.username}
                    {p.verified && <VerificationBadge />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.activity_type || 'Active'}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-lg text-blue-600">
                    {p.rank_score || 0}
                  </div>
                  <p className="text-xs text-gray-500">pts</p>
                </div>

              </div>
            );
          })}

        </div>
      </div>

    </div>
  )
}