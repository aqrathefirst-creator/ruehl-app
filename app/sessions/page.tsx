'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import VerificationBadge from '@/components/VerificationBadge'

type Profile = {
  id: string
  username: string
  avatar_url?: string | null
  verified?: boolean
  activity_type?: string | null
  rank_score?: number | null
  rating?: number | null
  sessions_completed?: number | null
  reliability_score?: number | null
  last_active?: string | null
  lat?: number | null
  lng?: number | null
}

type MatchCandidate = Profile & {
  followersCount: number
  distanceKm: number | null
  matchScore: number
  statusLabel: string
}

const toNum = (value: any) => {
  if (typeof value === 'number') return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const isRecentlyActive = (lastActive?: string | null, hours = 72) => {
  if (!lastActive) return false
  const diff = Date.now() - new Date(lastActive).getTime()
  return diff <= hours * 60 * 60 * 1000
}

const getDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function SessionsPage() {
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [follows, setFollows] = useState<any[]>([])
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationState, setLocationState] = useState<'idle' | 'granted' | 'blocked'>('idle')
  const [requesting, setRequesting] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [distanceFilter, setDistanceFilter] = useState<'all' | '5' | '15'>('all')
  const [genreFilter, setGenreFilter] = useState<string>('all')

  const isFeatureUnlocked = useMemo(() => {
    if (!currentProfile) return false
    return (
      (currentProfile.sessions_completed || 0) >= 5 ||
      !!currentProfile.verified ||
      (currentProfile.reliability_score || 0) >= 70
    )
  }, [currentProfile])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      setFeedback(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      setCurrentUserId(user.id)

      const [{ data: profilesData }, { data: followsData }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('follows').select('*'),
      ])

      const allProfiles = (profilesData || []) as Profile[]
      setProfiles(allProfiles)
      setFollows(followsData || [])
      setCurrentProfile(allProfiles.find((p) => p.id === user.id) || null)

      setLoading(false)
    }

    init()
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationState('blocked')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationState('granted')
      },
      () => {
        setLocationState('blocked')
      },
      { enableHighAccuracy: true, timeout: 7000 }
    )
  }, [])

  const followerCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    follows.forEach((f: any) => {
      if (!f.following_id) return
      counts[f.following_id] = (counts[f.following_id] || 0) + 1
    })
    return counts
  }, [follows])

  const currentFollowers = currentUserId ? (followerCounts[currentUserId] || 0) : 0

  const candidates = useMemo<MatchCandidate[]>(() => {
    if (!currentUserId || !currentProfile) return []

    const myRank = toNum((currentProfile as any).rank_score) ?? toNum(currentProfile.rating) ?? 0
    const myGenre = (currentProfile.activity_type || '').toLowerCase()

    return profiles
      .filter((p) => p.id !== currentUserId && p.username)
      .map((p) => {
        const candidateFollowers = followerCounts[p.id] || 0
        const candidateRank = toNum((p as any).rank_score) ?? toNum(p.rating) ?? 0
        const rankDiff = Math.abs(myRank - candidateRank)

        const rankScore = Math.max(0, 1 - rankDiff / 100)
        const followsSimilarity =
          1 -
          Math.min(
            1,
            Math.abs(candidateFollowers - currentFollowers) /
              Math.max(10, currentFollowers, candidateFollowers, 1)
          )

        const candidateGenre = (p.activity_type || '').toLowerCase()
        const genreScore =
          myGenre && candidateGenre
            ? myGenre === candidateGenre ||
              myGenre.includes(candidateGenre) ||
              candidateGenre.includes(myGenre)
              ? 1
              : 0.4
            : 0.5

        const bothVerified = !!currentProfile.verified && !!p.verified
        const verifiedScore = bothVerified ? 1 : p.verified ? 0.75 : 0.45

        let distanceKm: number | null = null
        let distanceScore = 0.45

        const pLat = toNum((p as any).lat)
        const pLng = toNum((p as any).lng)

        if (location && pLat !== null && pLng !== null) {
          distanceKm = getDistanceKm(location.lat, location.lng, pLat, pLng)
          if (distanceKm <= 2) distanceScore = 1
          else if (distanceKm <= 5) distanceScore = 0.85
          else if (distanceKm <= 15) distanceScore = 0.65
          else if (distanceKm <= 30) distanceScore = 0.4
          else distanceScore = 0.2
        }

        const activeScore = isRecentlyActive(p.last_active) ? 1 : 0.35
        const unlockedScore =
          (p.sessions_completed || 0) >= 5 || !!p.verified || (p.reliability_score || 0) >= 70

        const matchScore =
          rankScore * 0.26 +
          followsSimilarity * 0.2 +
          genreScore * 0.18 +
          verifiedScore * 0.14 +
          distanceScore * 0.16 +
          activeScore * 0.06

        let statusLabel = 'New'
        if ((p.sessions_completed || 0) > 20) statusLabel = 'Elite'
        else if ((p.sessions_completed || 0) > 8) statusLabel = 'Active'

        return {
          ...p,
          followersCount: candidateFollowers,
          distanceKm,
          matchScore: unlockedScore ? matchScore : matchScore * 0.45,
          statusLabel,
        }
      })
      .filter((p) => isRecentlyActive(p.last_active))
      .sort((a, b) => b.matchScore - a.matchScore)
  }, [currentUserId, currentProfile, profiles, followerCounts, currentFollowers, location])

  const genreOptions = useMemo(() => {
    const unique = new Set<string>()
    candidates.forEach((c) => {
      if (c.activity_type?.trim()) unique.add(c.activity_type.trim())
    })
    return ['all', ...Array.from(unique)]
  }, [candidates])

  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      const genrePass =
        genreFilter === 'all' ||
        (candidate.activity_type || '').toLowerCase() === genreFilter.toLowerCase()

      const distancePass =
        distanceFilter === 'all'
          ? true
          : distanceFilter === '5'
            ? candidate.distanceKm !== null && candidate.distanceKm <= 5
            : candidate.distanceKm !== null && candidate.distanceKm <= 15

      return genrePass && distancePass
    })
  }, [candidates, distanceFilter, genreFilter])

  const sendRequest = async (receiverId: string) => {
    if (!currentUserId || requesting) return

    setRequesting(receiverId)
    setFeedback(null)

    const payloads = [
      { sender_id: currentUserId, receiver_id: receiverId, status: 'pending' },
      { requester_id: currentUserId, target_id: receiverId, status: 'pending' },
    ]

    let success = false

    for (const payload of payloads) {
      const { error } = await supabase.from('training_requests').insert(payload as any)
      if (!error) {
        success = true
        break
      }
    }

    if (success) setFeedback('Request sent. If accepted, you will be matched.')
    else setFeedback('Could not send request right now. Please try again.')

    setRequesting(null)
  }

  return (
    <div className="flex justify-center min-h-screen bg-black">
      <div className="w-full max-w-[430px] bg-black text-white pb-32">
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <h1 className="text-2xl font-black">Sessions</h1>
          <p className="text-sm text-gray-400 mt-1">Smart matching by rank, following power, genre, verification, and distance</p>
          <div className="flex items-center gap-3 mt-3 text-xs">
            <span className="px-2 py-1 rounded-full bg-white/10 text-gray-300">
              {locationState === 'granted' ? 'Location on' : 'Location limited'}
            </span>
            <span className="px-2 py-1 rounded-full bg-white/10 text-gray-300">
              {isFeatureUnlocked ? 'Feature unlocked' : 'Unlock in progress'}
            </span>
          </div>
        </div>

        <div className="px-4 pt-5">
          <div className="mb-4 space-y-3">
            <div>
              <div className="text-[11px] text-gray-500 mb-2 uppercase tracking-wider">Distance</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDistanceFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs border ${
                    distanceFilter === 'all'
                      ? 'bg-purple-500 text-white border-purple-400'
                      : 'bg-white/10 border-white/15 text-gray-300'
                  }`}
                >
                  All distances
                </button>
                <button
                  onClick={() => setDistanceFilter('5')}
                  className={`px-3 py-1.5 rounded-full text-xs border ${
                    distanceFilter === '5'
                      ? 'bg-purple-500 text-white border-purple-400'
                      : 'bg-white/10 border-white/15 text-gray-300'
                  }`}
                >
                  Within 5km
                </button>
                <button
                  onClick={() => setDistanceFilter('15')}
                  className={`px-3 py-1.5 rounded-full text-xs border ${
                    distanceFilter === '15'
                      ? 'bg-purple-500 text-white border-purple-400'
                      : 'bg-white/10 border-white/15 text-gray-300'
                  }`}
                >
                  Within 15km
                </button>
              </div>
            </div>

            <div>
              <div className="text-[11px] text-gray-500 mb-2 uppercase tracking-wider">Fitness genre</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {genreOptions.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setGenreFilter(genre)}
                    className={`px-3 py-1.5 rounded-full text-xs border whitespace-nowrap ${
                      genreFilter === genre
                        ? 'bg-purple-500 text-white border-purple-400'
                        : 'bg-white/10 border-white/15 text-gray-300'
                    }`}
                  >
                    {genre === 'all' ? 'All genres' : genre}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading && <p className="text-gray-500 py-4">Loading matches...</p>}

          {!loading && !isFeatureUnlocked && (
            <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-300">
              Keep using the app consistently to fully unlock advanced session matching.
            </div>
          )}

          {!loading && feedback && (
            <div className="mb-4 rounded-xl border border-white/15 bg-white/5 p-3 text-xs text-gray-300">
              {feedback}
            </div>
          )}

          {!loading && filteredCandidates.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">No suitable matches right now.</div>
          )}

          {!loading && filteredCandidates.length > 0 && (
            <>
              <div className="mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Best Matches</h2>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {filteredCandidates.slice(0, 5).map((user) => (
                    <div key={user.id} className="min-w-[135px] bg-white/5 border border-white/10 rounded-2xl p-3 flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg mb-2 overflow-hidden">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={`${user.username} avatar`} className="w-full h-full object-cover" />
                        ) : (
                          user.username?.[0]?.toUpperCase()
                        )}
                      </div>
                      <div className="text-sm font-semibold truncate">{user.username}</div>
                      <div className="text-[10px] text-gray-400 mt-1">{Math.round(user.matchScore * 100)}% match</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Available To Train</h2>
                <div className="space-y-3">
                  {filteredCandidates.map((user) => (
                    <div key={user.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden flex items-center justify-center text-white font-semibold">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt={`${user.username} avatar`} className="w-full h-full object-cover" />
                            ) : (
                              user.username?.[0]?.toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold flex items-center gap-1 truncate">
                              {user.username}
                              {user.verified && <VerificationBadge />}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {user.activity_type || 'Fitness'} • {user.statusLabel}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-purple-300">{Math.round(user.matchScore * 100)}%</div>
                          <div className="text-[10px] text-gray-500">match</div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                        <span className="px-2 py-1 rounded-full bg-white/10 text-gray-300">Followers: {user.followersCount}</span>
                        <span className="px-2 py-1 rounded-full bg-white/10 text-gray-300">
                          {user.distanceKm === null ? 'Distance unavailable' : `${user.distanceKm.toFixed(1)} km away`}
                        </span>
                        <span className="px-2 py-1 rounded-full bg-white/10 text-gray-300">
                          Rank: {toNum((user as any).rank_score) ?? toNum(user.rating) ?? 0}
                        </span>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => sendRequest(user.id)}
                          disabled={requesting === user.id}
                          className="flex-1 px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium disabled:opacity-60"
                        >
                          {requesting === user.id ? 'Sending...' : 'Train'}
                        </button>
                        <button className="px-4 py-2 text-sm rounded-xl bg-white/10 text-gray-300">Skip</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}