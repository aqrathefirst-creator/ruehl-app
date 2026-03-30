'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type RequestRow = {
  id: string
  requester_id?: string | null
  sender_id?: string | null
  target_id?: string | null
  receiver_id?: string | null
  status: 'pending' | 'accepted' | 'declined'
}

type Profile = {
  id: string
  username?: string | null
  avatar_url?: string | null
  activity_type?: string | null
  rank_score?: number | null
}

type AuthUser = {
  id: string
}

export default function RequestsPage() {
  const [, setUser] = useState<AuthUser | null>(null)
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])

  async function init() {
    const { data } = await supabase.auth.getUser()
    setUser((data.user as AuthUser | null) || null)

    if (!data.user) return

    const { data: req } = await supabase
      .from('training_requests')
      .select('*')
      .or(`target_id.eq.${data.user.id},receiver_id.eq.${data.user.id}`)
      .order('created_at', { ascending: false })

    setRequests(req || [])

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')

    setProfiles(prof || [])
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void init()
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  // UPDATED FUNCTION (MATCH CREATION ADDED)
  const handleRequest = async (req: RequestRow, accept: boolean) => {
    if (accept) {
      // update request
      const requesterId = req.requester_id || req.sender_id
      const targetId = req.target_id || req.receiver_id

      await supabase
        .from('training_requests')
        .update({ status: 'accepted' })
        .eq('id', req.id)

      // check if match already exists (avoid duplicates)
      const { data: existing } = await supabase
        .from('training_matches')
        .select('id')
        .or(
          `and(user_a.eq.${requesterId},user_b.eq.${targetId}),and(user_a.eq.${targetId},user_b.eq.${requesterId})`
        )
        .single()

      if (!existing) {
        // create match
        await supabase.from('training_matches').insert({
          user_a: requesterId,
          user_b: targetId,
        })
      }
    } else {
      await supabase
        .from('training_requests')
        .update({ status: 'declined' })
        .eq('id', req.id)
    }

    init()
  }

  const getProfile = (userId: string) => {
    return profiles.find(p => p.id === userId)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      <h1 className="text-2xl font-bold">Requests</h1>

      {requests.length === 0 && (
        <div className="text-sm text-gray-500">
          No incoming requests
        </div>
      )}

      {requests.map(r => {
        const requesterId = r.requester_id || r.sender_id
        const p = getProfile(requesterId)

        return (
          <div key={r.id} className="p-4 rounded-xl bg-gray-900 space-y-3">

            <div className="flex gap-3 items-center">

              {p?.avatar_url && (
                <img
                  src={p.avatar_url}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}

              <div className="flex-1">

                <div className="font-semibold">
                  {p?.username || 'User'}
                </div>

                <div className="text-xs text-gray-400">
                  {p?.activity_type}
                </div>

                <div className="text-xs text-gray-400">
                  Rank: {p?.rank_score}
                </div>

              </div>

            </div>

            {r.status === 'pending' && (
              <div className="flex gap-2">

                <button
                  onClick={() => handleRequest(r, true)}
                  className="flex-1 bg-green-500 text-black py-2 rounded-lg"
                >
                  Accept
                </button>

                <button
                  onClick={() => handleRequest(r, false)}
                  className="flex-1 bg-gray-700 text-white py-2 rounded-lg"
                >
                  Decline
                </button>

              </div>
            )}

            {r.status === 'accepted' && (
              <div className="text-green-500 text-sm">
                ● Matched
              </div>
            )}

            {r.status === 'declined' && (
              <div className="text-gray-500 text-sm">
                Declined
              </div>
            )}

          </div>
        )
      })}

    </div>
  )
}