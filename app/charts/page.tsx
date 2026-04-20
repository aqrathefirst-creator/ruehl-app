'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { playPreviewAudio, stopPreviewAudio } from '@/lib/previewAudio'

type ChartRow = {
  sound_id: string | null
  rank: number
  title: string
  artist: string
  cover_url: string | null
  preview_url: string | null
  movement: string | null
  lifecycle: string | null
  usage_count?: number
}

type RawChartRow = {
  sound_id: string | null
  rank: number | null
  movement: string | null
  lifecycle: string | null
  sounds: {
    id: string | null
    track_name: string | null
    artist_name: string | null
    title: string | null
    artist: string | null
    cover_url: string | null
    thumbnail_url: string | null
    preview_url: string | null
    usage_count: number | null
  } | null
}

type UserSoundUsageRow = {
  sound_id: string | null
  created_at: string | null
}

type UsageMetricsRow = {
  sound_id: string | null
  user_id: string | null
  created_at: string | null
  alignment_score?: number | null
  likes_count?: number | null
  comments_count?: number | null
}

type ChartHistoryRow = {
  sound_id: string | null
  rank: number | null
  updated_at: string | null
}

type MomentumLevel = 'high' | 'medium' | 'low'

type ChartSignal = {
  momentum: number
  momentumLevel: MomentumLevel
  streakDays: number
  reason: string | null
  breakout: boolean
}

const movementValue = (movement: string | null) => {
  const normalized = (movement || '').trim().toLowerCase()
  if (!normalized) return null

  const parsed = Number.parseInt(normalized.replace(/[^\d+-]/g, ''), 10)
  const hasNumeric = !Number.isNaN(parsed)

  if (normalized.includes('up')) {
    return Math.abs(hasNumeric ? parsed : 1)
  }

  if (normalized.includes('down')) {
    return -Math.abs(hasNumeric ? parsed : 1)
  }

  if (hasNumeric) {
    return parsed
  }

  return null
}

const lifecycleLabel = (lifecycle: string | null) => {
  const normalized = (lifecycle || '').trim().toLowerCase()
  if (!normalized) return ''
  if (normalized === 'birth') return 'new'
  if (normalized === 'rise') return 'rising'
  if (normalized === 'decay') return 'falling'
  return ''
}

const movementBadge = (movement: string | null, lifecycle: string | null) => {
  const lifecycleToken = lifecycleLabel(lifecycle)
  const delta = movementValue(movement)

  if (lifecycleToken === 'new') {
    return {
      text: '• NEW',
      tone: 'text-zinc-300',
    }
  }

  if (typeof delta === 'number' && delta > 0) {
    return {
      text: `▲ +${Math.abs(delta)}`,
      tone: 'text-emerald-400',
    }
  }

  if (typeof delta === 'number' && delta < 0) {
    return {
      text: `▼ ${delta}`,
      tone: 'text-rose-400',
    }
  }

  return {
    text: '• NEW',
    tone: 'text-zinc-400',
  }
}

const contextLabel = (row: ChartRow) => {
  const lifecycleToken = lifecycleLabel(row.lifecycle)
  const delta = movementValue(row.movement)
  if (lifecycleToken === 'new') return 'New this week'
  if (typeof delta === 'number' && delta > 2) return 'Fast rising'
  if (row.rank === 1) return 'Dominating this week'
  return null
}

const getUpdatedText = (lastUpdatedAt: string | null) => {
  if (!lastUpdatedAt) return 'Updated recently'

  const updatedMs = new Date(lastUpdatedAt).getTime()
  if (!Number.isFinite(updatedMs)) return 'Updated recently'

  const diffMs = Date.now() - updatedMs
  const minutes = Math.max(0, Math.floor(diffMs / 60000))

  if (minutes < 1) return 'Updated just now'
  if (minutes < 60) return `Updated ${minutes} min ago`

  const hours = Math.floor(minutes / 60)
  return `Updated ${hours}h ago`
}

const canHoverPreview = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

const momentumToken = (level: MomentumLevel) => {
  if (level === 'high') return '🔥'
  if (level === 'medium') return '⚡'
  return '•'
}

const momentumTone = (level: MomentumLevel) => {
  if (level === 'high') return 'text-orange-300'
  if (level === 'medium') return 'text-amber-200'
  return 'text-zinc-500'
}

const getStreakDays = (createdAtValues: string[]) => {
  const uniqueDays = Array.from(new Set(
    createdAtValues
      .map((value) => new Date(value).toISOString().slice(0, 10))
      .filter(Boolean)
  )).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  if (!uniqueDays.length) return 0

  let streak = 1
  for (let index = 1; index < uniqueDays.length; index += 1) {
    const prev = new Date(uniqueDays[index - 1]).getTime()
    const curr = new Date(uniqueDays[index]).getTime()
    const diffDays = Math.round((prev - curr) / (24 * 60 * 60 * 1000))
    if (diffDays === 1) streak += 1
    else break
  }

  return streak
}

const trendingTooltip = (movement: string | null, momentumLevel: MomentumLevel) => {
  const delta = movementValue(movement) || 0
  if (momentumLevel === 'high' || delta > 2) return 'This sound is rising fast'
  return 'Everyone is using this sound today'
}


export default function ChartsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<ChartRow[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [updatedText, setUpdatedText] = useState('Updated recently')
  const [signalBySoundId, setSignalBySoundId] = useState<Record<string, ChartSignal>>({})
  const [trendingNow, setTrendingNow] = useState<ChartRow[]>([])
  const [breakoutRows, setBreakoutRows] = useState<ChartRow[]>([])
  const [userUsedSoundIds, setUserUsedSoundIds] = useState<Set<string>>(new Set())
  const [userSoundPostCountById, setUserSoundPostCountById] = useState<Record<string, number>>({})
  const [pulseSoundId, setPulseSoundId] = useState<string | null>(null)
  const [pressureMessage, setPressureMessage] = useState('Posting today can shift rankings')

  const openCreateWithSound = (row: ChartRow) => {
    if (!row.sound_id) return
    const params = new URLSearchParams({ soundId: row.sound_id })
    if (row.title) params.set('track', row.title)
    if (row.artist) params.set('artist', row.artist)
    router.push(`/create?${params.toString()}`)
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setUpdatedText(getUpdatedText(lastUpdatedAt))
    }, 60000)

    return () => clearInterval(timer)
  }, [lastUpdatedAt])

  useEffect(() => {
    const day = new Date().getDay()
    if (day === 0 || day === 6) {
      setPressureMessage('Weekend posts can shift rankings fast')
      return
    }
    setPressureMessage('Posting today can shift rankings')
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      const rising = rows
        .filter((row) => (movementValue(row.movement) || 0) > 0)
        .map((row) => row.sound_id)
        .filter((id): id is string => Boolean(id))

      if (!rising.length) {
        setPulseSoundId(null)
        return
      }

      const nextId = rising[Math.floor(Math.random() * rising.length)] || null
      setPulseSoundId(nextId)
      window.setTimeout(() => {
        setPulseSoundId((current) => (current === nextId ? null : current))
      }, 1800)
    }, 12000)

    return () => clearInterval(timer)
  }, [rows])

  useEffect(() => {
    let isMounted = true

    const loadCharts = async () => {
      setLoading(true)

      const selectAttempts = [
        `
          sound_id,
          rank,
          movement,
          lifecycle,
          sounds (
            id,
            track_name,
            artist_name,
            title,
            artist,
            cover_url,
            thumbnail_url,
            preview_url,
            usage_count
          )
        `,
        `
          sound_id,
          rank,
          movement,
          lifecycle,
          sounds (
            id,
            track_name,
            artist_name,
            title,
            artist,
            cover_url,
            thumbnail_url,
            preview_url
          )
        `,
        `
          sound_id,
          rank,
          movement,
          lifecycle,
          sounds (
            id,
            track_name,
            artist_name,
            title,
            artist
          )
        `,
      ]

      let data: unknown = null
      let error: { message?: string } | null = null

      for (const select of selectAttempts) {
        const result = await supabase
          .from('chart_scores')
          .select(select)
          .order('rank', { ascending: true })
          .limit(20)

        data = result.data
        error = result.error
        if (!error) break
      }

      if (error) {
        console.error(error)
        if (isMounted) {
          setRows([])
          setLoading(false)
        }
        return
      }

      const charts = (((data as unknown) as RawChartRow[] | null) || []).map((row) => ({
        sound_id: row.sound_id ?? null,
        rank: row.rank ?? 0,
        movement: row.movement,
        lifecycle: row.lifecycle,
        title:
          row.sounds?.track_name ||
          row.sounds?.title ||
          '',
        artist:
          row.sounds?.artist_name ||
          row.sounds?.artist ||
          '',
        cover_url: row.sounds?.cover_url || row.sounds?.thumbnail_url || null,
        preview_url: row.sounds?.preview_url || null,
        usage_count: row.sounds?.usage_count || 0,
      }))

      console.log('CHART DATA:', charts)
      if (!charts.length || !charts[0].title) {
        console.error('CHART DATA MISSING — CHECK DB OR JOIN')
      }

      if (isMounted) {
        setRows(charts)
        setLastUpdatedAt(null)
        setUpdatedText(getUpdatedText(null))
        setLoading(false)
      }

      const mappedSoundIds = charts.map((row) => row.sound_id).filter((id): id is string => Boolean(id))

      if (mappedSoundIds.length > 0) {
        const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
        const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime()
        const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const since2 = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        const since6Ms = Date.now() - 6 * 60 * 60 * 1000
        const since24Ms = Date.now() - 24 * 60 * 60 * 1000

        const [{ data: usageRows }, { data: chartHistoryRows }, { data: saveRows }, { data: usageCountRows }] = await Promise.all([
          supabase
            .from('posts')
            .select('sound_id, user_id, created_at, alignment_score, likes_count, comments_count')
            .in('sound_id', mappedSoundIds)
            .gte('created_at', since14),
          supabase
            .from('chart_scores')
            .select('sound_id, rank, updated_at')
            .in('sound_id', mappedSoundIds)
            .gte('updated_at', since14)
            .not('updated_at', 'is', null),
          supabase
            .from('saved_sounds')
            .select('sound_id, created_at')
            .in('sound_id', mappedSoundIds)
            .gte('created_at', since24),
          supabase
            .from('sounds')
            .select('id, usage_count')
            .in('id', mappedSoundIds),
        ])

        const usageStats = (((usageRows as unknown) as UsageMetricsRow[] | null) || []).reduce<
          Record<string, { recent: number; previous: number; recent6h: number; prev6hAvg: number; uniqueRecentUsers: Set<string>; alignmentTotal: number; alignmentCount: number; likes: number; comments: number; createdAtValues: string[]; latestCreatedAt: string | null }>
        >((acc, row) => {
          if (!row.sound_id || !row.created_at) return acc

          if (!acc[row.sound_id]) {
            acc[row.sound_id] = {
              recent: 0,
              previous: 0,
              recent6h: 0,
              prev6hAvg: 0,
              uniqueRecentUsers: new Set<string>(),
              alignmentTotal: 0,
              alignmentCount: 0,
              likes: 0,
              comments: 0,
              createdAtValues: [],
              latestCreatedAt: null,
            }
          }

          const ts = new Date(row.created_at).getTime()
          if (!Number.isFinite(ts)) return acc

          acc[row.sound_id].createdAtValues.push(row.created_at)
          if (!acc[row.sound_id].latestCreatedAt || ts > new Date(acc[row.sound_id].latestCreatedAt || 0).getTime()) {
            acc[row.sound_id].latestCreatedAt = row.created_at
          }

          acc[row.sound_id].likes += row.likes_count || 0
          acc[row.sound_id].comments += row.comments_count || 0

          if (ts >= since7) {
            acc[row.sound_id].recent += 1
            if (row.user_id) acc[row.sound_id].uniqueRecentUsers.add(row.user_id)
            acc[row.sound_id].alignmentTotal += row.alignment_score || 0
            acc[row.sound_id].alignmentCount += 1
          } else {
            acc[row.sound_id].previous += 1
          }

          if (ts >= since6Ms) {
            acc[row.sound_id].recent6h += 1
          }

          return acc
        }, {})

        Object.keys(usageStats).forEach((soundId) => {
          const total24h = usageStats[soundId].createdAtValues.filter((createdAt) => {
            const ts = new Date(createdAt).getTime()
            return Number.isFinite(ts) && ts >= since24Ms
          }).length
          const prevWindow = Math.max(0, total24h - usageStats[soundId].recent6h)
          usageStats[soundId].prev6hAvg = prevWindow / 3
        })

        const rankHistoryBySoundId = (((chartHistoryRows as unknown) as ChartHistoryRow[] | null) || []).reduce<
          Record<string, ChartHistoryRow[]>
        >((acc, row) => {
          if (!row.sound_id || typeof row.rank !== 'number' || !row.updated_at) return acc
          if (!acc[row.sound_id]) acc[row.sound_id] = []
          acc[row.sound_id].push(row)
          return acc
        }, {})

        const saveCountBySoundId = (((saveRows as unknown) as Array<{ sound_id: string | null }> | null) || []).reduce<Record<string, number>>((acc, row) => {
          if (!row.sound_id) return acc
          acc[row.sound_id] = (acc[row.sound_id] || 0) + 1
          return acc
        }, {})

        const usageCountBySoundId = (((usageCountRows as unknown) as Array<{ id: string; usage_count?: number | null }> | null) || []).reduce<Record<string, number>>((acc, row) => {
          if (!row.id) return acc
          acc[row.id] = row.usage_count || 0
          return acc
        }, {})

        const signals = charts.reduce<Record<string, ChartSignal>>((acc, row) => {
          if (!row.sound_id) return acc

          const usage = usageStats[row.sound_id]
          const viewsProxy = usage ? usage.recent * 20 : 0
          const likes = usage ? usage.likes : 0
          const comments = usage ? usage.comments : 0

          const latestCreatedAtMs = usage?.latestCreatedAt ? new Date(usage.latestCreatedAt).getTime() : 0
          const recencyLevel: MomentumLevel = latestCreatedAtMs >= new Date(since2).getTime()
            ? 'high'
            : latestCreatedAtMs >= new Date(since24).getTime()
              ? 'medium'
              : 'low'
          const recencyBoost = recencyLevel === 'high' ? 100 : recencyLevel === 'medium' ? 60 : 20

          const momentum =
            viewsProxy * 0.4 +
            likes * 0.3 +
            comments * 0.2 +
            recencyBoost * 0.1

          const history = (rankHistoryBySoundId[row.sound_id] || []).slice().sort((a, b) => {
            return new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime()
          })

          const previousRank = history.length > 0 ? history[0].rank : row.rank
          void previousRank

          const suddenSpike = usage ? usage.recent6h >= Math.max(2, usage.prev6hAvg * 2) : false
          const movement = movementValue(row.movement) || 0
          const breakout = movement >= 5 || suddenSpike

          const streakDays = usage ? getStreakDays(usage.createdAtValues) : 0

          const saves = saveCountBySoundId[row.sound_id] || 0
          const usageCount = usageCountBySoundId[row.sound_id] || 0
          let reason: string | null = null
          if (saves >= 4) reason = 'Highly saved'
          else if (comments >= 10) reason = 'Driving conversations'
          else if (usageCount >= 80) reason = 'Used across posts'
          else if (recencyLevel === 'high') reason = 'Blowing up now'

          acc[row.sound_id] = {
            momentum,
            momentumLevel: recencyLevel,
            streakDays,
            reason,
            breakout,
          }

          return acc
        }, {})

        const trendingRows = charts
          .slice()
          .sort((a, b) => {
            const aMomentum = signals[a.sound_id || '']?.momentum || 0
            const bMomentum = signals[b.sound_id || '']?.momentum || 0
            return bMomentum - aMomentum
          })
          .slice(0, 5)

        const breakoutRows = charts
          .filter((row) => row.sound_id && signals[row.sound_id]?.breakout)
          .sort((a, b) => {
            const aMomentum = signals[a.sound_id || '']?.momentum || 0
            const bMomentum = signals[b.sound_id || '']?.momentum || 0
            return bMomentum - aMomentum
          })
          .slice(0, 3)

        if (isMounted) {
          setSignalBySoundId(signals)
          setTrendingNow(trendingRows)
          setBreakoutRows(breakoutRows)
        }
      } else if (isMounted) {
        setSignalBySoundId({})
        setTrendingNow([])
        setBreakoutRows([])
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      const userId = session?.user?.id

      if (!userId) {
        if (isMounted) setUserUsedSoundIds(new Set())
        return
      }

      const { data: userSoundUsageData } = await supabase
        .from('posts')
        .select('sound_id, created_at')
        .eq('user_id', userId)
        .not('sound_id', 'is', null)

      const usageRows = (((userSoundUsageData as unknown) as UserSoundUsageRow[] | null) || [])
      const usageBySoundId = usageRows.reduce<Record<string, string>>((acc, row) => {
        if (!row.sound_id || !row.created_at) return acc
        const existing = acc[row.sound_id]
        if (!existing || new Date(row.created_at).getTime() < new Date(existing).getTime()) {
          acc[row.sound_id] = row.created_at
        }
        return acc
      }, {})
      const usageCountBySoundId = usageRows.reduce<Record<string, number>>((acc, row) => {
        if (!row.sound_id) return acc
        acc[row.sound_id] = (acc[row.sound_id] || 0) + 1
        return acc
      }, {})

      const userSoundIds = Object.keys(usageBySoundId)
      if (userSoundIds.length === 0) {
        if (isMounted) {
          setUserUsedSoundIds(new Set())
        }
        return
      }

      if (isMounted) {
        setUserUsedSoundIds(new Set(userSoundIds))
        setUserSoundPostCountById(usageCountBySoundId)
      }

      if (typeof window !== 'undefined') {
        const storageKey = 'ruehl_early_positions_v1'
        const raw = window.localStorage.getItem(storageKey)
        const stored = raw ? (JSON.parse(raw) as Record<string, string>) : {}

        userSoundIds.forEach((soundId) => {
          const chartRow = charts.find((item) => item.sound_id === soundId)
          if (chartRow && chartRow.rank > 10 && !stored[soundId]) {
            stored[soundId] = new Date().toISOString()
          }
        })

        window.localStorage.setItem(storageKey, JSON.stringify(stored))

        void stored
      }

      const { data: userChartHistoryRows } = await supabase
        .from('chart_scores')
        .select('sound_id, rank, updated_at')
        .in('sound_id', userSoundIds)
        .not('sound_id', 'is', null)

      const historyBySoundId = (((userChartHistoryRows as unknown) as ChartHistoryRow[] | null) || []).reduce<Record<string, ChartHistoryRow[]>>(
        (acc, row) => {
          if (!row.sound_id || typeof row.rank !== 'number') return acc
          if (!acc[row.sound_id]) acc[row.sound_id] = []
          acc[row.sound_id].push(row)
          return acc
        },
        {}
      )

      void historyBySoundId
    }

    void loadCharts()

    return () => {
      isMounted = false
    }
  }, [])

  const showEmpty = !loading && rows.length === 0
  const topRow = rows[0] ?? null
  const remainingRows = rows.slice(1)
  const featuredTopRow = rows[0] || null
  const featuredBreakoutRow = breakoutRows[0] || null

  return (
    <main className="mx-auto w-full max-w-[1120px] px-7 py-14 sm:px-12 sm:py-16 lg:px-16">
      <div className="mb-4 rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-200">
        {pressureMessage}
      </div>
      <header className="mb-14 sm:mb-16">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">RUEHL Charts</h1>
        <p className="mt-2 text-sm text-gray-500">Top 20 · Live</p>
        <p className="mt-1 text-xs text-gray-600">{updatedText}</p>
      </header>

      {loading && <p className="text-sm text-gray-500">Loading charts...</p>}

      {showEmpty && (
        <section>
          <h2 className="text-2xl font-semibold tracking-tight">RUEHL Charts</h2>
          <p className="mt-2 text-sm text-gray-600">No chart activity yet</p>
        </section>
      )}

      {!loading && rows.length > 0 && (
        <>
          {featuredTopRow && (
            <section className="mb-6">
              <div className="mb-2 text-xs uppercase tracking-[0.16em] text-fuchsia-300/80">Featured</div>
              <button
                type="button"
                onClick={() => featuredTopRow.sound_id && router.push(`/sound/${featuredTopRow.sound_id}`)}
                className="flex w-full items-center gap-3 rounded-xl border border-fuchsia-300/25 bg-fuchsia-400/[0.08] px-3 py-2 text-left"
              >
                {featuredTopRow.cover_url && <img src={featuredTopRow.cover_url} alt="" className="h-10 w-10 rounded-md object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{featuredTopRow.title}</p>
                  <p className="truncate text-[11px] text-white/65">{featuredTopRow.artist}</p>
                </div>
                <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-2 py-0.5 text-[10px] text-fuchsia-200">Featured</span>
              </button>
            </section>
          )}

          {trendingNow.length > 0 && (
            <section className="mb-8">
              <div className="mb-2 text-xs uppercase tracking-[0.16em] text-zinc-400">Trending Now</div>
              <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {trendingNow.map((row) => (
                  <button
                    key={`trending-${row.sound_id || row.rank}`}
                    type="button"
                    onClick={() => row.sound_id && router.push(`/sound/${row.sound_id}`)}
                    onMouseEnter={() => {
                      if (row.preview_url && canHoverPreview()) {
                        void playPreviewAudio(`trending:${row.sound_id || row.rank}`, row.preview_url)
                      }
                    }}
                    onMouseLeave={() => {
                      if (row.preview_url) stopPreviewAudio()
                    }}
                    className="min-w-[138px] shrink-0 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-left transition-all md:hover:scale-[1.02] md:hover:bg-white/[0.06]"
                  >
                    {row.cover_url && (
                      <img src={row.cover_url} alt="" className="h-20 w-full rounded-md object-cover" />
                    )}
                    <p className="mt-2 truncate text-xs font-semibold text-white">{row.title}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {topRow && (
            <section className="mb-16 sm:mb-20 lg:mb-24">
              <div
                role="button"
                tabIndex={0}
                onClick={() => topRow.sound_id && router.push(`/sound/${topRow.sound_id}`)}
                onKeyDown={(event) => {
                  if ((event.key === 'Enter' || event.key === ' ') && topRow.sound_id) {
                    event.preventDefault()
                    router.push(`/sound/${topRow.sound_id}`)
                  }
                }}
                onMouseEnter={() => {
                  if (topRow.preview_url && canHoverPreview()) {
                    void playPreviewAudio(`charts:${topRow.sound_id || topRow.rank}`, topRow.preview_url)
                  }
                }}
                onMouseLeave={() => {
                  if (topRow.preview_url) {
                    stopPreviewAudio()
                  }
                }}
                title={trendingTooltip(topRow.movement, signalBySoundId[topRow.sound_id || '']?.momentumLevel || 'low')}
                className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-5 text-left transition-all md:hover:scale-[1.015] md:hover:bg-white/[0.05] sm:gap-5 lg:gap-6"
              >
                <span className="w-20 shrink-0 text-5xl font-extrabold leading-none tracking-tight text-white tabular-nums sm:w-24 sm:text-6xl lg:w-28">
                  #{topRow.rank}
                </span>
                {topRow.cover_url && (
                  <img
                    src={topRow.cover_url}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-md object-cover sm:h-16 sm:w-16"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-2xl font-black text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.12)] sm:text-[30px]">{topRow.title}</div>
                  <div className="truncate text-sm text-gray-400">{topRow.artist}</div>
                  {contextLabel(topRow) && <p className="mt-1 text-[11px] text-white/62">{contextLabel(topRow)}</p>}
                  {topRow.sound_id && signalBySoundId[topRow.sound_id]?.reason && (
                    <p className="mt-1 text-[11px] text-zinc-400">{signalBySoundId[topRow.sound_id]?.reason}</p>
                  )}
                  {topRow.sound_id && userUsedSoundIds.has(topRow.sound_id) && (
                    <p className="mt-1 text-[11px] text-cyan-300">You contributed to this trend</p>
                  )}
                  {topRow.sound_id && signalBySoundId[topRow.sound_id]?.streakDays >= 7 && (
                    <p className="mt-1 text-[11px] text-orange-300">🔥 Hot streak</p>
                  )}
                  {topRow.sound_id && signalBySoundId[topRow.sound_id]?.streakDays >= 3 && signalBySoundId[topRow.sound_id]?.streakDays < 7 && (
                    <p className="mt-1 text-[11px] text-zinc-300">On chart {signalBySoundId[topRow.sound_id]?.streakDays} days</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        openCreateWithSound(topRow)
                      }}
                      className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-200"
                    >
                      Use Sound
                    </button>
                    {topRow.sound_id && userUsedSoundIds.has(topRow.sound_id) && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          openCreateWithSound(topRow)
                        }}
                        className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] text-white/90"
                      >
                        You can push this higher
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex w-20 shrink-0 justify-end sm:w-24 lg:w-28">
                  <span className={['text-sm font-semibold tracking-wide', movementBadge(topRow.movement, topRow.lifecycle).tone].join(' ')}>
                    {movementBadge(topRow.movement, topRow.lifecycle).text} <span className={momentumTone(signalBySoundId[topRow.sound_id || '']?.momentumLevel || 'low')}>{momentumToken(signalBySoundId[topRow.sound_id || '']?.momentumLevel || 'low')}</span>
                  </span>
                </div>
              </div>
            </section>
          )}

          {breakoutRows.length > 0 && (
            <section className="mb-10">
              <div className="mb-2 text-xs uppercase tracking-[0.16em] text-zinc-400">Breakouts</div>
              {featuredBreakoutRow && (
                <button
                  type="button"
                  onClick={() => featuredBreakoutRow.sound_id && router.push(`/sound/${featuredBreakoutRow.sound_id}`)}
                  className="mb-2 flex w-full items-center gap-3 rounded-xl border border-fuchsia-300/25 bg-fuchsia-400/[0.08] px-3 py-2 text-left"
                >
                  {featuredBreakoutRow.cover_url && <img src={featuredBreakoutRow.cover_url} alt="" className="h-10 w-10 rounded-md object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{featuredBreakoutRow.title}</p>
                    <p className="text-[11px] text-fuchsia-200/90">Featured</p>
                  </div>
                  <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-2 py-0.5 text-[10px] text-fuchsia-200">Featured</span>
                </button>
              )}
              <div className="space-y-2">
                {breakoutRows.map((row) => (
                  <button
                    key={`breakout-${row.sound_id || row.rank}`}
                    type="button"
                    onClick={() => row.sound_id && router.push(`/sound/${row.sound_id}`)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left transition-all md:hover:scale-[1.01] md:hover:bg-white/[0.05]"
                  >
                    {row.cover_url && <img src={row.cover_url} alt="" className="h-11 w-11 rounded-md object-cover" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{row.title}</p>
                      <p className="text-[11px] text-amber-300">Breakout</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {remainingRows.length > 0 && (
            <ol className="space-y-3">
              {remainingRows.map((row) => (
                <li
                  key={String(row.rank) + '-' + row.title + '-' + row.artist}
                  className={[
                    'group flex items-center gap-4 rounded-2xl border-b border-white/10 bg-transparent px-4 py-4 transition-all md:hover:scale-[1.012] md:hover:cursor-pointer md:hover:bg-white/[0.04] sm:gap-5 lg:gap-6',
                    pulseSoundId && row.sound_id === pulseSoundId ? 'shadow-[0_0_24px_rgba(245,158,11,0.24)]' : '',
                    row.sound_id && (userSoundPostCountById[row.sound_id] || 0) >= 3 ? 'border-cyan-300/20 bg-cyan-400/[0.04]' : '',
                  ].join(' ')}
                  onClick={() => row.sound_id && router.push(`/sound/${row.sound_id}`)}
                  onMouseEnter={() => {
                    if (row.preview_url && canHoverPreview()) {
                      void playPreviewAudio(`charts:${row.sound_id || row.rank}`, row.preview_url)
                    }
                  }}
                  onMouseLeave={() => {
                    if (row.preview_url) {
                      stopPreviewAudio()
                    }
                  }}
                  title={trendingTooltip(row.movement, signalBySoundId[row.sound_id || '']?.momentumLevel || 'low')}
                >
                  <span className="w-20 shrink-0 text-4xl font-extrabold leading-none tracking-tight text-white tabular-nums sm:w-24 sm:text-5xl lg:w-28">
                    #{row.rank}
                  </span>
                  {row.cover_url && (
                    <img
                      src={row.cover_url}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[17px] font-bold text-white">{row.title}</div>
                    <div className="truncate text-sm text-gray-400">{row.artist}</div>
                    {contextLabel(row) && <p className="mt-1 text-[11px] text-white/60">{contextLabel(row)}</p>}
                    {row.sound_id && signalBySoundId[row.sound_id]?.reason && (
                      <p className="mt-1 text-[11px] text-zinc-400">{signalBySoundId[row.sound_id]?.reason}</p>
                    )}
                    {row.sound_id && userUsedSoundIds.has(row.sound_id) && (
                      <p className="mt-1 text-[11px] text-cyan-300">You contributed to this trend</p>
                    )}
                    {row.sound_id && signalBySoundId[row.sound_id]?.streakDays >= 7 && (
                      <p className="mt-1 text-[11px] text-orange-300">🔥 Hot streak</p>
                    )}
                    {row.sound_id && signalBySoundId[row.sound_id]?.streakDays >= 3 && signalBySoundId[row.sound_id]?.streakDays < 7 && (
                      <p className="mt-1 text-[11px] text-zinc-300">On chart {signalBySoundId[row.sound_id]?.streakDays} days</p>
                    )}
                    {row.sound_id && (userSoundPostCountById[row.sound_id] || 0) >= 3 && (
                      <p className="mt-1 text-[11px] text-cyan-200">You are shaping this trend</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          openCreateWithSound(row)
                        }}
                        className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-200"
                      >
                        Use Sound
                      </button>
                      {row.sound_id && userUsedSoundIds.has(row.sound_id) && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            openCreateWithSound(row)
                          }}
                          className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] text-white/90"
                        >
                          You can push this higher
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex w-20 shrink-0 justify-end sm:w-24 lg:w-28">
                    <span
                      className={[
                        movementBadge(row.movement, row.lifecycle).tone,
                        'text-sm font-semibold tracking-wide transition-opacity duration-200 group-hover:opacity-95',
                      ].join(' ')}
                    >
                      {movementBadge(row.movement, row.lifecycle).text} <span className={momentumTone(signalBySoundId[row.sound_id || '']?.momentumLevel || 'low')}>{momentumToken(signalBySoundId[row.sound_id || '']?.momentumLevel || 'low')}</span>
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </main>
  )
}
