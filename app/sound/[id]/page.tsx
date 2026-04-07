'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '../../../lib/supabase'
import { playPreviewAudio } from '../../../lib/previewAudio'

type Sound = {
  id: string
  track_name?: string | null
  artist_name?: string | null
  cover_url?: string | null
  preview_url?: string | null
  usage_count?: number | null
}

type ProfileRow = {
  id: string
  username: string | null
}

type UserImpact = {
  posts: number
  firstUseAt: string | null
  chartRank: number | null
  chartMovement: string | null
}

type Post = {
  id: string
  content?: string | null
  media_url?: string | null
  created_at: string
  likes_count?: number | null
  comments_count?: number | null
  alignment_score?: number | null
  user_id: string
}

type ContributorRow = {
  userId: string
  username: string
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export default function SoundPage() {
  const params = useParams()
  const soundId = params?.id as string | undefined

  const [sound, setSound] = useState<Sound | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [userImpact, setUserImpact] = useState<UserImpact | null>(null)
  const [contributors, setContributors] = useState<ContributorRow[]>([])
  const [isTopContributor, setIsTopContributor] = useState(false)
  const [soundRank, setSoundRank] = useState<number | null>(null)
  const [enteredEarly, setEnteredEarly] = useState(false)

  useEffect(() => {
    if (!soundId) return

    const load = async () => {
      setLoading(true)

      const { data: sound } = await supabase
        .from('sounds')
        .select('*')
        .eq('id', soundId)
        .single()

      const { data: posts } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          media_url,
          created_at,
          likes_count,
          comments_count,
          alignment_score,
          user_id
        `)
        .eq('sound_id', soundId)

      const { data: chartRow } = await supabase
        .from('chart_scores')
        .select('rank, movement')
        .eq('sound_id', soundId)
        .maybeSingle()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user?.id) {
        const [{ data: ownPosts }, { data: chartImpactRow }] = await Promise.all([
          supabase
            .from('posts')
            .select('created_at')
            .eq('user_id', user.id)
            .eq('sound_id', soundId)
            .order('created_at', { ascending: true })
            .limit(200),
          supabase
            .from('chart_scores')
            .select('rank, movement')
            .eq('sound_id', soundId)
            .maybeSingle(),
        ])

        const own = (ownPosts || []) as Array<{ created_at: string | null }>
        const ownPostCount = own.length
        setUserImpact({
          posts: ownPostCount,
          firstUseAt: own[0]?.created_at || null,
          chartRank: (chartImpactRow as { rank?: number | null } | null)?.rank ?? null,
          chartMovement: (chartImpactRow as { movement?: string | null } | null)?.movement ?? null,
        })
      } else {
        setUserImpact(null)
      }

      const rankedPosts = ((posts || []) as Post[]).sort((a, b) => {
        const scoreA =
          (a.likes_count || 0) * 2 +
          (a.comments_count || 0) * 3 +
          (a.alignment_score || 0) * 2 +
          new Date(a.created_at).getTime()

        const scoreB =
          (b.likes_count || 0) * 2 +
          (b.comments_count || 0) * 3 +
          (b.alignment_score || 0) * 2 +
          new Date(b.created_at).getTime()

        return scoreB - scoreA
      })

      setSound((sound as Sound) || null)
      setPosts(rankedPosts)

      const uniqueUserIds = Array.from(new Set(rankedPosts.map((row) => row.user_id).filter(Boolean)))
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', uniqueUserIds)

      const usernameById = ((profileRows || []) as ProfileRow[]).reduce<Record<string, string>>((acc, row) => {
        acc[row.id] = row.username || 'user'
        return acc
      }, {})

      const contributionMap = rankedPosts.reduce<Record<string, { posts: number; engagement: number }>>((acc, row) => {
        if (!row.user_id) return acc
        if (!acc[row.user_id]) {
          acc[row.user_id] = { posts: 0, engagement: 0 }
        }
        acc[row.user_id].posts += 1
        acc[row.user_id].engagement += (row.likes_count || 0) + (row.comments_count || 0)
        return acc
      }, {})

      const topContributors = Object.entries(contributionMap)
        .map(([userId, metrics]) => {
          return {
            userId,
            username: usernameById[userId] || 'user',
          }
        })
        .sort((a, b) => contributionMap[b.userId].engagement - contributionMap[a.userId].engagement)
        .slice(0, 5)

      setContributors(topContributors)
      setIsTopContributor(Boolean(user?.id && topContributors[0]?.userId === user.id))

      const rank = (chartRow as { rank?: number | null } | null)?.rank ?? null
      setSoundRank(rank)

      const recent24hPosts = rankedPosts.filter((row) => {
        const ts = new Date(row.created_at).getTime()
        return Number.isFinite(ts) && Date.now() - ts <= 24 * 60 * 60 * 1000
      }).length
      const recentEngagement = rankedPosts
        .filter((row) => {
          const ts = new Date(row.created_at).getTime()
          return Number.isFinite(ts) && Date.now() - ts <= 24 * 60 * 60 * 1000
        })
        .reduce((sum, row) => sum + (row.likes_count || 0) + (row.comments_count || 0), 0)
      const momentum = clamp(recent24hPosts * 12 + recentEngagement * 2, 0, 100)

      const usageCount = (sound as Sound | null)?.usage_count || rankedPosts.length
      const usageNorm = clamp((usageCount / 200) * 100, 0, 100)
      const rankWeight = typeof rank === 'number' ? clamp(((21 - Math.min(Math.max(rank, 1), 20)) / 20) * 100, 0, 100) : 20
      const latestPostTs = rankedPosts[0]?.created_at ? new Date(rankedPosts[0].created_at).getTime() : 0
      const recencyScore = latestPostTs && Date.now() - latestPostTs <= 2 * 60 * 60 * 1000
        ? 100
        : latestPostTs && Date.now() - latestPostTs <= 24 * 60 * 60 * 1000
          ? 60
          : 20

      void rankWeight
      void momentum
      void usageNorm
      void recencyScore

      if (typeof window !== 'undefined') {
        const key = 'ruehl_early_positions_v1'
        const stored = JSON.parse(window.localStorage.getItem(key) || '{}') as Record<string, string>
        const userOwnPosts = rankedPosts.filter((row) => row.user_id === user?.id).length
        if (user?.id && userOwnPosts > 0 && typeof rank === 'number' && rank > 10 && !stored[soundId]) {
          stored[soundId] = new Date().toISOString()
          window.localStorage.setItem(key, JSON.stringify(stored))
        }
        setEnteredEarly(Boolean(stored[soundId]) && Boolean(typeof rank === 'number' && rank <= 10))
      }

      setLoading(false)
    }

    void load()
  }, [soundId])

  const metrics = useMemo(() => {
    const totalPosts = posts.length
    const uniqueUsers = new Set(posts.map((post) => post.user_id).filter(Boolean)).size
    const avgAlignment = totalPosts
      ? Math.round((posts.reduce((sum, post) => sum + (post.alignment_score || 0), 0) / totalPosts) * 10) / 10
      : 0
    return { totalPosts, uniqueUsers, avgAlignment }
  }, [posts])

  const handlePreviewClick = async () => {
    await playPreviewAudio(`sound:${sound?.id || soundId || 'unknown'}`, sound?.preview_url || null)
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto w-full max-w-[820px] px-4 py-6">
        <button type="button" onClick={handlePreviewClick} className="block w-full text-left">
          {sound?.cover_url ? (
            <Image
              src={sound.cover_url}
              alt=""
              width={1200}
              height={420}
              unoptimized
              className="h-[220px] w-full rounded-xl object-cover"
            />
          ) : null}

          <div className="mt-4 space-y-1">
            <div className="flex items-center gap-2">
              <div className="text-xl font-semibold">{sound?.track_name || ''}</div>
            </div>
            <div className="text-sm text-white/70">{sound?.artist_name || ''}</div>
            <div className="text-[11px] text-zinc-400">{soundRank ? `#${soundRank}` : 'Unranked'}</div>
            {enteredEarly && <div className="text-[11px] text-emerald-300">You entered early</div>}
            {isTopContributor && <div className="text-[11px] text-cyan-300">You are shaping this trend</div>}
          </div>
        </button>

        <div className="mt-3 text-xs text-white/60">
          <div>Total posts: {metrics.totalPosts}</div>
          <div>Unique users: {metrics.uniqueUsers}</div>
          <div>Avg alignment: {metrics.avgAlignment}</div>
        </div>

        {userImpact && userImpact.posts > 0 && (
          <div className="mt-4 rounded-xl border border-cyan-300/25 bg-cyan-400/10 p-3 text-xs text-cyan-100">
            <div className="font-semibold text-cyan-200">Your Impact</div>
            <div className="mt-1">Posts with this sound: {userImpact.posts}</div>
            {userImpact.chartRank ? <div>Current chart rank: #{userImpact.chartRank}</div> : null}
            {userImpact.chartMovement ? <div>Movement: {userImpact.chartMovement}</div> : null}
            {userImpact.firstUseAt && userImpact.posts >= 3 ? <div className="mt-1 text-cyan-200">Early adopter: trend shaper</div> : null}
          </div>
        )}

        {contributors.length > 0 && (
          <div className="mt-4 rounded-xl border border-white/15 bg-white/[0.03] p-3 text-xs">
            <div className="font-semibold text-white">Top Contributors</div>
            <div className="mt-2 space-y-1.5">
              {contributors.map((contributor, index) => (
                <div key={`${contributor.userId}-${index}`} className="flex items-center text-white/80">
                  <div className="truncate">{index + 1}. {contributor.username}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </section>

      <section className="mx-auto w-full max-w-[820px] px-4 pb-10">
        {loading && <div className="text-sm text-white/60">Loading...</div>}

        {!loading && posts.length === 0 && <div className="text-sm text-white/60" />}

        <div className="space-y-6">
          {posts.map((post) => (
            <article key={post.id} className="space-y-2">
              {post.media_url ? (
                <Image
                  src={post.media_url}
                  alt=""
                  width={1200}
                  height={1200}
                  unoptimized
                  className="h-auto w-full rounded-xl object-contain"
                />
              ) : null}
              <p className="text-sm text-white/90">{post.content || ''}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
